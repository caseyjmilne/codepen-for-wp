<?php
/**
 * Server-side render for the CodePen Snippet block.
 *
 * Outputs a CodePen "Prefill Embed": the HTML/CSS/JS live right here in the
 * markup (sourced from WordPress), and CodePen's embed script turns it into
 * an interactive editor/preview in the visitor's browser. No CodePen account,
 * API key, or network round-trip to CodePen is needed to store the code.
 *
 * @var array  $attributes Block attributes.
 * @var string $content    Block inner content (unused, block has no innerBlocks).
 * @var WP_Block $block    Block instance.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$defaults = CPFWP_Settings::get_settings();

$html = isset( $attributes['html'] ) ? (string) $attributes['html'] : '';
$css  = isset( $attributes['css'] ) ? (string) $attributes['css'] : '';
$js   = isset( $attributes['js'] ) ? (string) $attributes['js'] : '';
$title = isset( $attributes['title'] ) ? (string) $attributes['title'] : '';

if ( '' === trim( $html ) && '' === trim( $css ) && '' === trim( $js ) ) {
	if ( current_user_can( 'edit_posts' ) ) {
		echo '<p><em>' . esc_html__( 'CodePen Snippet: add some HTML, CSS or JS in the block editor to see a preview here.', 'codepen-for-wp' ) . '</em></p>';
	}
	return;
}

$theme = isset( $attributes['theme'] ) && 'inherit' !== $attributes['theme'] ? $attributes['theme'] : $defaults['theme'];
$height = ! empty( $attributes['height'] ) ? absint( $attributes['height'] ) : absint( $defaults['height'] );
$default_tab = isset( $attributes['defaultTab'] ) && 'inherit' !== $attributes['defaultTab'] ? $attributes['defaultTab'] : $defaults['default_tab'];
$editable = isset( $attributes['editable'] ) && 'inherit' !== $attributes['editable']
	? ( 'true' === $attributes['editable'] )
	: ! empty( $defaults['editable'] );

$wrapper_attrs = array(
	'class'            => 'codepen',
	'data-prefill'     => '',
	'data-height'      => (string) $height,
	'data-default-tab' => $default_tab,
);

if ( 'default' !== $theme ) {
	$wrapper_attrs['data-theme-id'] = $theme;
}

if ( $editable ) {
	$wrapper_attrs['data-editable'] = 'true';
}

$attr_string = '';
foreach ( $wrapper_attrs as $name => $value ) {
	$attr_string .= sprintf( ' %s="%s"', esc_attr( $name ), esc_attr( $value ) );
}

$block_wrapper_attributes = get_block_wrapper_attributes();

cpfwp_enqueue_embed_script();
?>
<div <?php echo wp_kses_post( $block_wrapper_attributes ); ?>>
	<?php if ( $title ) : ?>
		<p class="cpfwp-snippet-title"><?php echo esc_html( $title ); ?></p>
	<?php endif; ?>
	<div<?php echo $attr_string; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built and escaped above. ?>>
		<?php if ( '' !== trim( $html ) ) : ?>
			<pre data-lang="html"><?php echo esc_html( $html ); ?></pre>
		<?php endif; ?>
		<?php if ( '' !== trim( $css ) ) : ?>
			<pre data-lang="css"><?php echo esc_html( $css ); ?></pre>
		<?php endif; ?>
		<?php if ( '' !== trim( $js ) ) : ?>
			<pre data-lang="js"><?php echo esc_html( $js ); ?></pre>
		<?php endif; ?>
	</div>
</div>
<?php
