import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	PanelBody,
	BaseControl,
	TextControl,
	SelectControl,
	CheckboxControl,
	RangeControl,
} from '@wordpress/components';
import { useRef, useEffect } from '@wordpress/element';
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

function isUntouchedSettings( attributes ) {
	return SETTINGS_KEYS.every( ( key ) => attributes[ key ] === metadata.attributes[ key ].default );
}

/**
 * A single labeled code field, backed by WordPress' bundled CodeMirror (the
 * same editor Core's Custom HTML block uses) when it's available, falling
 * back to a plain textarea if the current user has syntax highlighting
 * turned off in their profile.
 */
function CodeField( { lang, label, value, onChange } ) {
	const textareaRef = useRef( null );
	const cmRef = useRef( null );

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
		<div className="cpfwp-code-field">
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

registerBlockType( metadata.name, {
	edit( { attributes, setAttributes } ) {
		const blockProps = useBlockProps();
		const defaults = blockData.defaults || {};

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
					<CodeField
						lang="html"
						label="HTML"
						value={ attributes.html }
						onChange={ ( value ) => setAttributes( { html: value } ) }
					/>
					<CodeField
						lang="css"
						label="CSS"
						value={ attributes.css }
						onChange={ ( value ) => setAttributes( { css: value } ) }
					/>
					<CodeField
						lang="js"
						label="JS"
						value={ attributes.js }
						onChange={ ( value ) => setAttributes( { js: value } ) }
					/>
				</div>
			</>
		);
	},
	// Server-side rendered (see render.php) — nothing to persist to post_content.
	save: () => null,
} );
