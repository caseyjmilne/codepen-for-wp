( function ( wp ) {
	'use strict';

	var el = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var useRef = wp.element.useRef;
	var useEffect = wp.element.useEffect;
	var registerBlockType = wp.blocks.registerBlockType;
	var InspectorControls = wp.blockEditor.InspectorControls;
	var useBlockProps = wp.blockEditor.useBlockProps;
	var PanelBody = wp.components.PanelBody;
	var TextControl = wp.components.TextControl;
	var SelectControl = wp.components.SelectControl;
	var RangeControl = wp.components.RangeControl;
	var __ = wp.i18n.__;

	var blockData = window.cpfwpBlockData || { codeEditor: {}, defaults: {} };

	/**
	 * A single labeled code field, backed by WordPress' bundled CodeMirror
	 * (the same editor core's Custom HTML block uses) when it's available,
	 * falling back to a plain textarea if the user has syntax highlighting
	 * turned off in their profile.
	 */
	function CodeField( props ) {
		var textareaRef = useRef( null );
		var cmRef = useRef( null );

		useEffect( function () {
			var settings = blockData.codeEditor ? blockData.codeEditor[ props.lang ] : null;

			if ( settings && wp.codeEditor && textareaRef.current ) {
				var editor = wp.codeEditor.initialize( textareaRef.current, settings );
				cmRef.current = editor.codemirror;
				cmRef.current.setValue( props.value || '' );
				cmRef.current.on( 'blur', function ( instance ) {
					props.onChange( instance.getValue() );
				} );
			}

			return function () {
				if ( cmRef.current ) {
					cmRef.current.toTextArea();
					cmRef.current = null;
				}
			};
			// Initialize once per mount; CodeMirror manages its own value after that.
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [] );

		return el(
			'div',
			{ className: 'cpfwp-code-field' },
			el( 'label', { className: 'cpfwp-code-field__label' }, props.label ),
			el( 'textarea', {
				ref: textareaRef,
				className: 'cpfwp-code-field__textarea',
				defaultValue: props.value,
				onChange: function ( event ) {
					// Fallback path when CodeMirror never attaches.
					if ( ! cmRef.current ) {
						props.onChange( event.target.value );
					}
				},
				onBlur: function ( event ) {
					if ( ! cmRef.current ) {
						props.onChange( event.target.value );
					}
				},
				rows: 8,
			} )
		);
	}

	registerBlockType( 'codepen-for-wp/snippet', {
		edit: function ( editProps ) {
			var attributes = editProps.attributes;
			var setAttributes = editProps.setAttributes;
			var blockProps = useBlockProps();
			var defaults = blockData.defaults || {};

			return el(
				Fragment,
				{},
				el(
					InspectorControls,
					{},
					el(
						PanelBody,
						{ title: __( 'CodePen Embed Settings', 'codepen-for-wp' ) },
						el( TextControl, {
							label: __( 'Title', 'codepen-for-wp' ),
							value: attributes.title,
							onChange: function ( value ) {
								setAttributes( { title: value } );
							},
						} ),
						el( SelectControl, {
							label: __( 'Theme', 'codepen-for-wp' ),
							value: attributes.theme,
							options: [
								{ label: __( 'Inherit site default', 'codepen-for-wp' ) + ' (' + ( defaults.theme || 'default' ) + ')', value: 'inherit' },
								{ label: __( 'Default', 'codepen-for-wp' ), value: 'default' },
								{ label: __( 'Light', 'codepen-for-wp' ), value: 'light' },
								{ label: __( 'Dark', 'codepen-for-wp' ), value: 'dark' },
							],
							onChange: function ( value ) {
								setAttributes( { theme: value } );
							},
						} ),
						el( RangeControl, {
							label: __( 'Height (px) — 0 to inherit site default', 'codepen-for-wp' ),
							value: attributes.height,
							min: 0,
							max: 2000,
							step: 10,
							onChange: function ( value ) {
								setAttributes( { height: value } );
							},
						} ),
						el( SelectControl, {
							label: __( 'Default Tab', 'codepen-for-wp' ),
							value: attributes.defaultTab,
							options: [
								{ label: __( 'Inherit site default', 'codepen-for-wp' ), value: 'inherit' },
								{ label: __( 'Result (preview)', 'codepen-for-wp' ), value: 'result' },
								{ label: 'HTML', value: 'html' },
								{ label: 'CSS', value: 'css' },
								{ label: 'JS', value: 'js' },
							],
							onChange: function ( value ) {
								setAttributes( { defaultTab: value } );
							},
						} ),
						el( SelectControl, {
							label: __( 'Editable Preview', 'codepen-for-wp' ),
							value: attributes.editable,
							options: [
								{ label: __( 'Inherit site default', 'codepen-for-wp' ), value: 'inherit' },
								{ label: __( 'Yes', 'codepen-for-wp' ), value: 'true' },
								{ label: __( 'No', 'codepen-for-wp' ), value: 'false' },
							],
							onChange: function ( value ) {
								setAttributes( { editable: value } );
							},
						} )
					)
				),
				el(
					'div',
					blockProps,
					el( CodeField, {
						lang: 'html',
						label: 'HTML',
						value: attributes.html,
						onChange: function ( value ) {
							setAttributes( { html: value } );
						},
					} ),
					el( CodeField, {
						lang: 'css',
						label: 'CSS',
						value: attributes.css,
						onChange: function ( value ) {
							setAttributes( { css: value } );
						},
					} ),
					el( CodeField, {
						lang: 'js',
						label: 'JS',
						value: attributes.js,
						onChange: function ( value ) {
							setAttributes( { js: value } );
						},
					} )
				)
			);
		},
		save: function () {
			// Server-side render (see render.php) — nothing to save to post_content
			// besides the attributes block.json already persists as JSON comment data.
			return null;
		},
	} );
} )( window.wp );
