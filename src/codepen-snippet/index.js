import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	PanelBody,
	BaseControl,
	TextControl,
	SelectControl,
	CheckboxControl,
	RangeControl,
	TabPanel,
	Button,
	Spinner,
} from '@wordpress/components';
import { useRef, useEffect, useState } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as preferencesStore } from '@wordpress/preferences';
import { __ } from '@wordpress/i18n';

import metadata from './block.json';
import './editor.css';

// Settings + site defaults handed over from PHP (see CPFWP_Block::enqueue_editor_assets).
const blockData = window.cpfwpBlockData || { codeEditor: {}, defaults: {} };

// Which "settings" attributes get remembered (via @wordpress/preferences) and
// reapplied to the next freshly-inserted block, as opposed to content
// attributes (title/html/css/js) which are obviously always per-instance.
const SETTINGS_KEYS = [ 'theme', 'height', 'defaultTab', 'editable' ];
const PREFERENCE_SCOPE = 'codepen-for-wp/snippet';
const PREFERENCE_KEY = 'lastUsedSettings';

const TAB_PANES = [
	{ key: 'html', label: 'HTML' },
	{ key: 'css', label: 'CSS' },
	{ key: 'js', label: 'JS' },
	{ key: 'result', label: __( 'Result (preview)', 'codepen-for-wp' ) },
];
const TAB_PANE_ORDER = TAB_PANES.map( ( pane ) => pane.key );

// Tabs shown in the block's own editing UI (distinct from the "Default
// Tab(s)" display setting above, which is about the front-end embed).
const EDITOR_TABS = [
	{ name: 'html', title: 'HTML' },
	{ name: 'css', title: 'CSS' },
	{ name: 'js', title: 'JS' },
	{ name: 'preview', title: __( 'Preview', 'codepen-for-wp' ) },
];

function isUntouchedSettings( attributes ) {
	return SETTINGS_KEYS.every( ( key ) => attributes[ key ] === metadata.attributes[ key ].default );
}

/**
 * A single labeled code field, backed by WordPress' bundled CodeMirror (the
 * same editor Core's Custom HTML block uses) when it's available, falling
 * back to a plain textarea if the current user has syntax highlighting
 * turned off in their profile. Stays mounted (just visually hidden) while
 * its tab isn't active, so switching tabs doesn't lose cursor/scroll/undo
 * history — CodeMirror just needs a `refresh()` once it becomes visible
 * again, since it can't measure itself correctly while `display: none`.
 */
function CodeField( { lang, label, value, onChange, isActive } ) {
	const textareaRef = useRef( null );
	const cmRef = useRef( null );

	useEffect( () => {
		if ( isActive && cmRef.current ) {
			cmRef.current.refresh();
		}
	}, [ isActive ] );

	useEffect( () => {
		const settings = blockData.codeEditor ? blockData.codeEditor[ lang ] : null;

		if ( settings && window.wp.codeEditor && textareaRef.current ) {
			const editor = window.wp.codeEditor.initialize( textareaRef.current, settings );
			cmRef.current = editor.codemirror;
			cmRef.current.setValue( value || '' );
			cmRef.current.on( 'blur', ( instance ) => onChange( instance.getValue() ) );

			// The block editor canvas normally treats Tab as "move to the next
			// block/toolbar", which is exactly what a code field must NOT do —
			// Tab needs to indent. Handle it explicitly, ahead of Gutenberg's
			// own key handling, so indenting a selection (or inserting a tab
			// at the cursor) always wins. Escape still lets a keyboard user
			// deliberately leave the field.
			cmRef.current.on( 'keydown', ( instance, event ) => {
				if ( 'Tab' === event.key ) {
					event.preventDefault();
					event.stopPropagation();
					if ( event.shiftKey ) {
						instance.execCommand( 'indentLess' );
					} else if ( instance.somethingSelected() ) {
						instance.execCommand( 'indentMore' );
					} else {
						instance.execCommand( 'insertTab' );
					}
				} else if ( 'Escape' === event.key ) {
					instance.getInputField().blur();
				}
			} );
		}

		return () => {
			if ( cmRef.current ) {
				cmRef.current.toTextArea();
				cmRef.current = null;
			}
		};
		// Initialize once per mount; CodeMirror manages its own value after that.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	return (
		<div className="cpfwp-code-field" style={ { display: isActive ? 'block' : 'none' } }>
			<label className="cpfwp-code-field__label">{ label }</label>
			<textarea
				ref={ textareaRef }
				className="cpfwp-code-field__textarea"
				defaultValue={ value }
				rows={ 8 }
				onChange={ ( event ) => {
					// Fallback path when CodeMirror never attaches.
					if ( ! cmRef.current ) {
						onChange( event.target.value );
					}
				} }
				onBlur={ ( event ) => {
					if ( ! cmRef.current ) {
						onChange( event.target.value );
					}
				} }
			/>
		</div>
	);
}

const CODEPEN_EMBED_SCRIPT_SRC = 'https://public.codepenassets.com/embed/index.js';
const CODEPEN_EMBED_SCRIPT_ID = 'cpfwp-codepen-embed-script';

/**
 * A live CodePen "Prefill Embed" preview of the current HTML/CSS/JS, built
 * right in the block editor using the same mechanism the front end uses —
 * no data is sent to or stored on CodePen's servers. Rebuilt from scratch
 * each time this tab is opened (or Refresh is pressed): CodePen doesn't
 * document a way to update an existing embed in place, only to convert a
 * prepared element into one via the global window.__CPEmbed(selector) call.
 *
 * The embed script must run inside the SAME document as the target element.
 * The block editor canvas renders in an iframe, so the script tag is
 * injected into that iframe's own document (via a ref's ownerDocument)
 * rather than the top-level admin document.
 */
function PreviewPane( { isActive, html, css, js } ) {
	const containerRef = useRef( null );
	const [ refreshToken, setRefreshToken ] = useState( 0 );
	const [ isLoading, setIsLoading ] = useState( false );

	useEffect( () => {
		if ( ! isActive || ! containerRef.current ) {
			return;
		}

		const doc = containerRef.current.ownerDocument;
		const win = doc.defaultView;

		if ( ! doc.getElementById( CODEPEN_EMBED_SCRIPT_ID ) ) {
			const script = doc.createElement( 'script' );
			script.id = CODEPEN_EMBED_SCRIPT_ID;
			script.async = true;
			script.src = CODEPEN_EMBED_SCRIPT_SRC;
			doc.body.appendChild( script );
		}

		containerRef.current.innerHTML = '';
		const wrapper = doc.createElement( 'div' );
		wrapper.className = 'cpfwp-preview-target';
		wrapper.setAttribute( 'data-height', '300' );
		wrapper.setAttribute( 'data-default-tab', 'result' );

		( [ [ 'html', html ], [ 'css', css ], [ 'js', js ] ] ).forEach( ( [ lang, code ] ) => {
			if ( code && code.trim() ) {
				const pre = doc.createElement( 'pre' );
				pre.setAttribute( 'data-lang', lang );
				pre.textContent = code;
				wrapper.appendChild( pre );
			}
		} );

		containerRef.current.appendChild( wrapper );

		setIsLoading( true );
		let pollId;
		const convert = () => {
			setIsLoading( false );
			wrapper.classList.add( 'codepen' );
			win.__CPEmbed( '.cpfwp-preview-target' );
		};

		if ( win.__CPEmbed ) {
			convert();
		} else {
			pollId = win.setInterval( () => {
				if ( win.__CPEmbed ) {
					win.clearInterval( pollId );
					convert();
				}
			}, 200 );
		}

		return () => {
			if ( pollId ) {
				win.clearInterval( pollId );
			}
		};
		// Deliberately re-run only when the tab is opened or Refresh is
		// clicked — not on every keystroke, since editing happens on a
		// different (hidden) tab anyway.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ isActive, refreshToken ] );

	return (
		<div className="cpfwp-preview-pane" style={ { display: isActive ? 'block' : 'none' } }>
			<div className="cpfwp-preview-pane__toolbar">
				<Button variant="secondary" onClick={ () => setRefreshToken( ( n ) => n + 1 ) }>
					{ __( 'Refresh Preview', 'codepen-for-wp' ) }
				</Button>
				{ isLoading && <Spinner /> }
			</div>
			{ ! html && ! css && ! js && (
				<p className="cpfwp-preview-pane__empty">
					{ __( 'Add some HTML, CSS or JS to see a live preview here.', 'codepen-for-wp' ) }
				</p>
			) }
			<div ref={ containerRef } />
		</div>
	);
}

registerBlockType( metadata.name, {
	edit( { attributes, setAttributes } ) {
		const blockProps = useBlockProps();
		const defaults = blockData.defaults || {};
		const [ activeTab, setActiveTab ] = useState( 'html' );

		const lastUsedSettings = useSelect(
			( select ) => select( preferencesStore ).get( PREFERENCE_SCOPE, PREFERENCE_KEY ),
			[]
		);
		const { set: setPreference } = useDispatch( preferencesStore );

		// A freshly-inserted block still has every "settings" attribute at its
		// out-of-the-box default. In that case only, adopt whatever settings
		// were last used on any other CodePen Snippet block, so you don't have
		// to re-pick theme/height/tabs/editable every single time.
		useEffect( () => {
			if ( lastUsedSettings && isUntouchedSettings( attributes ) ) {
				setAttributes( lastUsedSettings );
			}
			// Intentionally only checked once, right after mount.
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [] );

		function updateSetting( changes ) {
			setAttributes( changes );
			const nextSettings = { ...lastUsedSettings };
			SETTINGS_KEYS.forEach( ( key ) => {
				nextSettings[ key ] = key in changes ? changes[ key ] : attributes[ key ];
			} );
			setPreference( PREFERENCE_SCOPE, PREFERENCE_KEY, nextSettings );
		}

		const activeTabPanes = ( attributes.defaultTab === 'inherit'
			? defaults.default_tab || 'result'
			: attributes.defaultTab
		)
			.split( ',' )
			.map( ( pane ) => pane.trim() )
			.filter( Boolean );

		function toggleTabPane( pane, checked ) {
			const next = checked
				? [ ...activeTabPanes, pane ]
				: activeTabPanes.filter( ( active ) => active !== pane );
			const ordered = TAB_PANE_ORDER.filter( ( key ) => next.includes( key ) );
			updateSetting( { defaultTab: ordered.length ? ordered.join( ',' ) : 'inherit' } );
		}

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'CodePen Embed Settings', 'codepen-for-wp' ) }>
						<TextControl
							label={ __( 'Title', 'codepen-for-wp' ) }
							value={ attributes.title }
							onChange={ ( value ) => setAttributes( { title: value } ) }
						/>
						<SelectControl
							label={ __( 'Theme', 'codepen-for-wp' ) }
							value={ attributes.theme }
							options={ [
								{ label: `${ __( 'Inherit site default', 'codepen-for-wp' ) } (${ defaults.theme || 'default' })`, value: 'inherit' },
								{ label: __( 'Default', 'codepen-for-wp' ), value: 'default' },
								{ label: __( 'Light', 'codepen-for-wp' ), value: 'light' },
								{ label: __( 'Dark', 'codepen-for-wp' ), value: 'dark' },
							] }
							onChange={ ( value ) => updateSetting( { theme: value } ) }
						/>
						<RangeControl
							label={ __( 'Height (px) — 0 to inherit site default', 'codepen-for-wp' ) }
							value={ attributes.height }
							min={ 0 }
							max={ 2000 }
							step={ 10 }
							onChange={ ( value ) => updateSetting( { height: value } ) }
						/>
						<BaseControl label={ __( 'Default Tab(s)', 'codepen-for-wp' ) }>
							<p className="components-base-control__help">
								{ __( 'Check more than one — e.g. CSS + Result — to show a split view instead of a single tab.', 'codepen-for-wp' ) }
							</p>
							{ TAB_PANES.map( ( pane ) => (
								<CheckboxControl
									key={ pane.key }
									label={ pane.label }
									checked={ activeTabPanes.includes( pane.key ) }
									onChange={ ( checked ) => toggleTabPane( pane.key, checked ) }
								/>
							) ) }
						</BaseControl>
						<SelectControl
							label={ __( 'Editable Preview', 'codepen-for-wp' ) }
							value={ attributes.editable }
							options={ [
								{ label: __( 'Inherit site default', 'codepen-for-wp' ), value: 'inherit' },
								{ label: __( 'Yes', 'codepen-for-wp' ), value: 'true' },
								{ label: __( 'No', 'codepen-for-wp' ), value: 'false' },
							] }
							onChange={ ( value ) => updateSetting( { editable: value } ) }
						/>
					</PanelBody>
				</InspectorControls>
				<div { ...blockProps }>
					<TabPanel
						className="cpfwp-editor-tabs"
						tabs={ EDITOR_TABS }
						initialTabName="html"
						onSelect={ setActiveTab }
					>
						{ () => null }
					</TabPanel>
					<CodeField
						lang="html"
						label="HTML"
						value={ attributes.html }
						onChange={ ( value ) => setAttributes( { html: value } ) }
						isActive={ activeTab === 'html' }
					/>
					<CodeField
						lang="css"
						label="CSS"
						value={ attributes.css }
						onChange={ ( value ) => setAttributes( { css: value } ) }
						isActive={ activeTab === 'css' }
					/>
					<CodeField
						lang="js"
						label="JS"
						value={ attributes.js }
						onChange={ ( value ) => setAttributes( { js: value } ) }
						isActive={ activeTab === 'js' }
					/>
					<PreviewPane
						isActive={ activeTab === 'preview' }
						html={ attributes.html }
						css={ attributes.css }
						js={ attributes.js }
					/>
				</div>
			</>
		);
	},
	// Server-side rendered (see render.php) — nothing to persist to post_content.
	save: () => null,
} );
