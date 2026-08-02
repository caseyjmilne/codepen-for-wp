<?php
/**
 * Fires when the plugin is deleted (not just deactivated) via the Plugins
 * screen, so it doesn't leave its own data behind.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

/**
 * Removes this plugin's settings option and strips its own scope out of
 * every user's persisted block-editor preferences (@wordpress/preferences)
 * for the current site — never the whole "persisted_preferences" value,
 * since that also holds unrelated editor preferences (fullscreen mode,
 * welcome guide dismissal, etc.) that aren't this plugin's to delete.
 */
function cpfwp_uninstall_site() {
	global $wpdb;

	delete_option( 'cpfwp_settings' );

	$meta_key = $wpdb->get_blog_prefix() . 'persisted_preferences';
	$users    = get_users( array( 'fields' => array( 'ID' ) ) );

	foreach ( $users as $user ) {
		$preferences = get_user_meta( $user->ID, $meta_key, true );
		if ( ! is_array( $preferences ) || ! isset( $preferences['codepen-for-wp/snippet'] ) ) {
			continue;
		}
		unset( $preferences['codepen-for-wp/snippet'] );
		update_user_meta( $user->ID, $meta_key, $preferences );
	}
}

if ( is_multisite() ) {
	foreach ( get_sites( array( 'fields' => 'ids' ) ) as $site_id ) {
		switch_to_blog( $site_id );
		cpfwp_uninstall_site();
		restore_current_blog();
	}
} else {
	cpfwp_uninstall_site();
}
