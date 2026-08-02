<?php
/**
 * Registers the "CodePen Snippet" block and its editor assets.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CPFWP_Block {

	const EDITOR_SCRIPT_HANDLE = 'cpfwp-block-editor';
	const EDITOR_STYLE_HANDLE  = 'cpfwp-block-editor-style';
	const EMBED_SCRIPT_HANDLE  = 'cpfwp-codepen-embed';
	const EMBED_SCRIPT_SRC     = 'https://public.codepenassets.com/embed/index.js';

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'init', array( $this, 'register_block' ) );
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ) );
	}

	/**
	 * Registers the editor script/style handles and the block itself from block.json.
	 * The script is registered (not enqueued) here; register_block_type() takes care
	 * of enqueuing it only on screens where the block is actually usable.
	 */
	public function register_block() {
		wp_register_script(
			self::EDITOR_SCRIPT_HANDLE,
			CPFWP_URL . 'blocks/codepen-snippet/index.js',
			array(
				'wp-blocks',
				'wp-element',
				'wp-block-editor',
				'wp-components',
				'wp-i18n',
				'wp-code-editor',
				'code-editor',
			),
			CPFWP_VERSION,
			true
		);

		wp_register_style(
			self::EDITOR_STYLE_HANDLE,
			CPFWP_URL . 'blocks/codepen-snippet/editor.css',
			array(),
			CPFWP_VERSION
		);

		register_block_type( CPFWP_PATH . 'blocks/codepen-snippet' );
	}

	/**
	 * Boots CodeMirror for the block editor and hands the block's JS the
	 * per-language settings plus the site's configured display defaults.
	 */
	public function enqueue_editor_assets() {
		$cm_settings = array(
			'html' => wp_enqueue_code_editor( array( 'type' => 'text/html' ) ),
			'css'  => wp_enqueue_code_editor( array( 'type' => 'text/css' ) ),
			'js'   => wp_enqueue_code_editor( array( 'type' => 'text/javascript' ) ),
		);

		wp_localize_script( self::EDITOR_SCRIPT_HANDLE, 'cpfwpBlockData', array(
			'codeEditor' => $cm_settings,
			'defaults'   => CPFWP_Settings::get_settings(),
		) );
	}

	/**
	 * Enqueues CodePen's public embed loader on the front end, once per page,
	 * only when a CodePen Snippet block is actually rendered. This is a static
	 * asset served by CodePen for the sole purpose of drawing the embed iframe;
	 * it takes no code or data from us and needs no credentials.
	 */
	public static function enqueue_embed_script() {
		if ( ! wp_script_is( self::EMBED_SCRIPT_HANDLE, 'registered' ) ) {
			wp_register_script( self::EMBED_SCRIPT_HANDLE, self::EMBED_SCRIPT_SRC, array(), null, true );
			wp_script_add_data( self::EMBED_SCRIPT_HANDLE, 'strategy', 'async' );
		}
		wp_enqueue_script( self::EMBED_SCRIPT_HANDLE );
	}
}

/**
 * Thin procedural wrapper so render.php doesn't need to know the class name.
 */
function cpfwp_enqueue_embed_script() {
	CPFWP_Block::enqueue_embed_script();
}
