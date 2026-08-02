import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	SelectControl,
	RangeControl,
} from '@wordpress/components';
import { useRef, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import metadata from './block.json';
import './editor.css';

// Settings + site defaults handed over from PHP (see CPFWP_Block::enqueue_editor_assets).
const blockData = window.cpfwpBlockData || { codeEditor: {}, defaults: {} };

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
							onChange={ ( value ) => setAttributes( { theme: value } ) }
						/>
						<RangeControl
							label={ __( 'Height (px) — 0 to inherit site default', 'codepen-for-wp' ) }
							value={ attributes.height }
							min={ 0 }
							max={ 2000 }
							step={ 10 }
							onChange={ ( value ) => setAttributes( { height: value } ) }
						/>
						<SelectControl
							label={ __( 'Default Tab', 'codepen-for-wp' ) }
							value={ attributes.defaultTab }
							options={ [
								{ label: __( 'Inherit site default', 'codepen-for-wp' ), value: 'inherit' },
								{ label: __( 'Result (preview)', 'codepen-for-wp' ), value: 'result' },
								{ label: 'HTML', value: 'html' },
								{ label: 'CSS', value: 'css' },
								{ label: 'JS', value: 'js' },
							] }
							onChange={ ( value ) => setAttributes( { defaultTab: value } ) }
						/>
						<SelectControl
							label={ __( 'Editable Preview', 'codepen-for-wp' ) }
							value={ attributes.editable }
							options={ [
								{ label: __( 'Inherit site default', 'codepen-for-wp' ), value: 'inherit' },
								{ label: __( 'Yes', 'codepen-for-wp' ), value: 'true' },
								{ label: __( 'No', 'codepen-for-wp' ), value: 'false' },
							] }
							onChange={ ( value ) => setAttributes( { editable: value } ) }
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
