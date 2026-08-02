<?php
/**
 * Plugin Name:       CodePen for WP
 * Description:       Drop in a Gutenberg block, write HTML/CSS/JS in a real code editor, and display it as a live, interactive CodePen embed — sourced entirely from WordPress content, not from a CodePen account.
 * Version:           0.1.0
 * Requires at least: 6.1
 * Requires PHP:      7.4
 * Author:            Casey Milne
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       codepen-for-wp
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CPFWP_VERSION', '0.1.0' );
define( 'CPFWP_FILE', __FILE__ );
define( 'CPFWP_PATH', plugin_dir_path( __FILE__ ) );
define( 'CPFWP_URL', plugin_dir_url( __FILE__ ) );

require_once CPFWP_PATH . 'includes/class-cpfwp-settings.php';
require_once CPFWP_PATH . 'includes/class-cpfwp-block.php';

/**
 * Boots the plugin's pieces once all plugins are loaded.
 */
function cpfwp_init() {
	CPFWP_Settings::instance();
	CPFWP_Block::instance();
}
add_action( 'plugins_loaded', 'cpfwp_init' );

/**
 * Seeds default settings on activation so the block always has values to fall back on.
 */
function cpfwp_activate() {
	if ( false === get_option( CPFWP_Settings::OPTION_KEY ) ) {
		update_option( CPFWP_Settings::OPTION_KEY, CPFWP_Settings::get_defaults() );
	}
}
register_activation_hook( __FILE__, 'cpfwp_activate' );
