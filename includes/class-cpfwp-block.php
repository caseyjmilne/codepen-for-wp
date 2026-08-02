<?php
/**
 * Registers the "CodePen Snippet" block and its editor assets.
 *
 * The block's JS/CSS are built from source/ via `npm run build` (see
 * package.json and src/codepen-snippet). register_block_type() reads
 * build/codepen-snippet/block.json and auto-registers the compiled
 * index.js/editor.css with the dependency list + cache-busting version
 * that the build generates in index.asset.php — no manual
 * wp_register_script() call needed for those.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CPFWP_Block {

	/**
	 * Handle WordPress auto-generates for a block.json "editorScript" entry,
	 * following core's `{namespace}-{block}-editor-script` convention.
	 */
	const EDITOR_SCRIPT_HANDLE = 'codepen-for-wp-snippet-editor-script';
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

	public function register_block() {
		$block_path = CPFWP_PATH . 'build/codepen-snippet';

		if ( ! file_exists( $block_path . '/block.json' ) ) {
			add_action( 'admin_notices', array( $this, 'render_missing_build_notice' ) );
			return;
		}

		register_block_type( $block_path );
	}

	public function render_missing_build_notice() {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}
		printf(
			'<div class="notice notice-error"><p>%s</p></div>',
			wp_kses(
				sprintf(
					/* translators: %s: npm command to run. */
					__( 'CodePen for WP: no build found for the block yet. Run %s from the plugin directory, then reload this page.', 'codepen-for-wp' ),
					'<code>npm install &amp;&amp; npm run build</code>'
				),
				array( 'code' => array() )
			)
		);
	}

	/**
	 * Boots CodeMirror for the block editor, hands the block's JS the
	 * per-language settings plus the site's configured display defaults,
	 * and makes sure CodeMirror's own script (wp.codeEditor) is guaranteed
	 * to load before our editor script runs it.
	 */
	public function enqueue_editor_assets() {
		if ( ! wp_script_is( self::EDITOR_SCRIPT_HANDLE, 'registered' ) ) {
			return; // Block hasn't been built yet; nothing to localize.
		}

		global $wp_scripts;
		if ( isset( $wp_scripts->registered[ self::EDITOR_SCRIPT_HANDLE ] )
			&& ! in_array( 'code-editor', $wp_scripts->registered[ self::EDITOR_SCRIPT_HANDLE ]->deps, true ) ) {
			$wp_scripts->registered[ self::EDITOR_SCRIPT_HANDLE ]->deps[] = 'code-editor';
		}

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
			// version is deliberately null (not omitted): this is a third-party
			// CDN asset we don't control the versioning of, and null tells
			// wp_register_script() not to append our own cache-busting query
			// string to a URL that already manages its own caching.
			wp_register_script( self::EMBED_SCRIPT_HANDLE, self::EMBED_SCRIPT_SRC, array(), null, true ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
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
