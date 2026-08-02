<?php
/**
 * Admin settings screen for CodePen for WP.
 *
 * CodePen has no authenticated API for creating or reading pens, so there
 * are no API keys to store here. What this screen configures instead are
 * the default display options for the "Prefill Embed" markup the block
 * outputs (theme, height, which tab opens first, whether the live preview
 * is editable). Any of these can be overridden per-block.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CPFWP_Settings {

	const OPTION_KEY  = 'cpfwp_settings';
	const OPTION_GROUP = 'cpfwp_settings_group';
	const PAGE_SLUG   = 'codepen-for-wp';

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'admin_menu', array( $this, 'add_settings_page' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
	}

	/**
	 * Baseline values used on activation and whenever a stored option is missing a key.
	 */
	/**
	 * Panes CodePen's "data-default-tab" attribute can show. It accepts a
	 * comma-separated combination of these (e.g. "css,result") to show more
	 * than one pane by default, not just a single tab.
	 */
	const TAB_PANES = array( 'html', 'css', 'js', 'result' );

	public static function get_defaults() {
		return array(
			'theme'        => 'default',     // default|light|dark
			'height'       => 400,
			'default_tab'  => 'css,result',  // comma-separated subset of self::TAB_PANES
			'editable'     => false,
		);
	}

	/**
	 * Normalizes a "default tab" value into a comma-joined string of valid
	 * panes, in canonical (html, css, js, result) order, deduplicated.
	 * Falls back to $fallback if nothing valid survives.
	 */
	public static function sanitize_default_tab( $value, $fallback = 'result' ) {
		$requested = array_map( 'trim', explode( ',', (string) $value ) );
		$valid     = array_values( array_intersect( self::TAB_PANES, $requested ) );
		return $valid ? implode( ',', $valid ) : $fallback;
	}

	/**
	 * Reads the stored settings merged over the defaults.
	 */
	public static function get_settings() {
		$stored = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}
		return wp_parse_args( $stored, self::get_defaults() );
	}

	public function add_settings_page() {
		add_options_page(
			__( 'CodePen for WP', 'codepen-for-wp' ),
			__( 'CodePen for WP', 'codepen-for-wp' ),
			'manage_options',
			self::PAGE_SLUG,
			array( $this, 'render_settings_page' )
		);
	}

	public function register_settings() {
		register_setting(
			self::OPTION_GROUP,
			self::OPTION_KEY,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( $this, 'sanitize_settings' ),
				'default'           => self::get_defaults(),
			)
		);

		add_settings_section(
			'cpfwp_display_section',
			__( 'Default Embed Display Options', 'codepen-for-wp' ),
			function () {
				echo '<p>' . esc_html__( 'These defaults apply to every CodePen Snippet block. Each block can override them individually.', 'codepen-for-wp' ) . '</p>';
			},
			self::PAGE_SLUG
		);

		add_settings_field(
			'cpfwp_theme',
			__( 'Theme', 'codepen-for-wp' ),
			array( $this, 'render_theme_field' ),
			self::PAGE_SLUG,
			'cpfwp_display_section'
		);

		add_settings_field(
			'cpfwp_height',
			__( 'Height (px)', 'codepen-for-wp' ),
			array( $this, 'render_height_field' ),
			self::PAGE_SLUG,
			'cpfwp_display_section'
		);

		add_settings_field(
			'cpfwp_default_tab',
			__( 'Default Tab', 'codepen-for-wp' ),
			array( $this, 'render_default_tab_field' ),
			self::PAGE_SLUG,
			'cpfwp_display_section'
		);

		add_settings_field(
			'cpfwp_editable',
			__( 'Editable Preview', 'codepen-for-wp' ),
			array( $this, 'render_editable_field' ),
			self::PAGE_SLUG,
			'cpfwp_display_section'
		);
	}

	public function sanitize_settings( $input ) {
		$defaults = self::get_defaults();
		$output   = array();

		$allowed_themes = array( 'default', 'light', 'dark' );
		$output['theme'] = in_array( $input['theme'] ?? '', $allowed_themes, true )
			? $input['theme']
			: $defaults['theme'];

		$height           = isset( $input['height'] ) ? absint( $input['height'] ) : $defaults['height'];
		$output['height'] = min( max( $height, 100 ), 2000 );

		$requested_tabs         = isset( $input['default_tab'] ) ? (array) $input['default_tab'] : array();
		$output['default_tab'] = self::sanitize_default_tab( implode( ',', $requested_tabs ), $defaults['default_tab'] );

		$output['editable'] = ! empty( $input['editable'] );

		return $output;
	}

	public function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'CodePen for WP', 'codepen-for-wp' ); ?></h1>
			<p>
				<?php esc_html_e( 'CodePen does not provide API keys for this integration — code you write here is embedded directly via CodePen\'s free "Prefill Embed" feature. Your HTML/CSS/JS lives in WordPress; CodePen only renders the preview in the visitor\'s browser.', 'codepen-for-wp' ); ?>
			</p>
			<form action="options.php" method="post">
				<?php
				settings_fields( self::OPTION_GROUP );
				do_settings_sections( self::PAGE_SLUG );
				submit_button();
				?>
			</form>
		</div>
		<?php
	}

	public function render_theme_field() {
		$settings = self::get_settings();
		?>
		<select name="<?php echo esc_attr( self::OPTION_KEY ); ?>[theme]">
			<?php foreach ( array( 'default' => __( 'Default', 'codepen-for-wp' ), 'light' => __( 'Light', 'codepen-for-wp' ), 'dark' => __( 'Dark', 'codepen-for-wp' ) ) as $value => $label ) : ?>
				<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $settings['theme'], $value ); ?>>
					<?php echo esc_html( $label ); ?>
				</option>
			<?php endforeach; ?>
		</select>
		<?php
	}

	public function render_height_field() {
		$settings = self::get_settings();
		?>
		<input type="number" min="100" max="2000" step="10"
			name="<?php echo esc_attr( self::OPTION_KEY ); ?>[height]"
			value="<?php echo esc_attr( $settings['height'] ); ?>" />
		<?php
	}

	public function render_default_tab_field() {
		$settings     = self::get_settings();
		$active_panes = explode( ',', $settings['default_tab'] );
		$labels       = array(
			'html'   => 'HTML',
			'css'    => 'CSS',
			'js'     => 'JS',
			'result' => __( 'Result (preview)', 'codepen-for-wp' ),
		);
		?>
		<fieldset>
			<?php foreach ( $labels as $pane => $label ) : ?>
				<label style="display:inline-block;margin-right:16px;">
					<input type="checkbox"
						name="<?php echo esc_attr( self::OPTION_KEY ); ?>[default_tab][]"
						value="<?php echo esc_attr( $pane ); ?>"
						<?php checked( in_array( $pane, $active_panes, true ) ); ?> />
					<?php echo esc_html( $label ); ?>
				</label>
			<?php endforeach; ?>
			<p class="description">
				<?php esc_html_e( 'Which panes are visible by default. Check more than one (e.g. CSS + Result) to show a split view instead of a single tab.', 'codepen-for-wp' ); ?>
			</p>
		</fieldset>
		<?php
	}

	public function render_editable_field() {
		$settings = self::get_settings();
		?>
		<label>
			<input type="checkbox" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[editable]" value="1" <?php checked( $settings['editable'] ); ?> />
			<?php esc_html_e( 'Allow visitors to edit the code in the embedded preview (changes are local to their browser only — nothing is saved back to WordPress or CodePen).', 'codepen-for-wp' ); ?>
		</label>
		<?php
	}
}
