import { useResponsive } from '../../hooks/useResponsive';

/**
 * ResponsiveGrid Component
 * Automatically adjusts columns based on screen size
 * Supports mobile, tablet, desktop, and TV screens
 */
export default function ResponsiveGrid({
  children,
  cols = { xs: 1, sm: 2, md: 2, lg: 3, xl: 4, '2xl': 5 },
  gap = 'md',
  className = '',
  style = {},
  minColWidth = 280,
  auto = false,
  ...props
}) {
  const { isExtraSmall, isSmall, isMobile, isTablet, isSmallDesktop, isTV, is4K } = useResponsive();

  // Determine active columns
  const getColumns = () => {
    if (isExtraSmall) return cols.xs || 1;
    if (isSmall) return cols.sm || 2;
    if (isMobile && !isTablet) return cols.md || 2;
    if (isTablet) return cols.lg || 3;
    if (isSmallDesktop) return cols.xl || 4;
    if (isTV) return cols['2xl'] || 5;
    if (is4K) return cols['3xl'] || 6;
    return 4;
  };

  // Gap values
  const gapValues = {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: auto
      ? `repeat(auto-fit, minmax(min(100%, ${minColWidth}px), 1fr))`
      : `repeat(${getColumns()}, 1fr)`,
    gap: gapValues[gap] || gap,
    ...style,
  };

  return (
    <div
      className={`responsive-grid grid-${getColumns()} ${className}`}
      style={gridStyle}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * ResponsiveContainer Component
 * Wraps content with responsive padding and max-width
 */
export function ResponsiveContainer({
  children,
  maxWidth = 'lg',
  padding = 'md',
  className = '',
  style = {},
  fluid = false,
  ...props
}) {
  const { isMobile, isTablet, isDesktop, isTV, is4K } = useResponsive();

  const maxWidths = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    full: '100%',
  };

  const paddings = {
    xs: { mobile: '0.5rem', tablet: '0.75rem', desktop: '1rem' },
    sm: { mobile: '0.75rem', tablet: '1rem', desktop: '1.5rem' },
    md: { mobile: '1rem', tablet: '1.5rem', desktop: '2rem' },
    lg: { mobile: '1.5rem', tablet: '2rem', desktop: '2.5rem' },
    xl: { mobile: '2rem', tablet: '2.5rem', desktop: '3rem' },
  };

  const getPadding = () => {
    const pad = paddings[padding] || paddings.md;
    if (isMobile) return pad.mobile;
    if (isTablet) return pad.tablet;
    return pad.desktop;
  };

  const containerStyle = {
    width: fluid ? '100%' : `min(${maxWidths[maxWidth] || maxWidth}, 100%)`,
    maxWidth: '100%',
    margin: '0 auto',
    padding: getPadding(),
    ...style,
  };

  return (
    <div
      className={`responsive-container container-${maxWidth} ${className}`}
      style={containerStyle}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * ResponsiveFlex Component
 * Flexible layout that changes direction based on screen size
 */
export function ResponsiveFlex({
  children,
  direction = { xs: 'column', lg: 'row' },
  gap = 'md',
  align = 'center',
  justify = 'flex-start',
  className = '',
  style = {},
  wrap = true,
  ...props
}) {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const getDirection = () => {
    if ((isMobile || isTablet) && direction.xs) return direction.xs;
    if (isDesktop && direction.lg) return direction.lg;
    return direction;
  };

  const gapValues = {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  };

  const flexStyle = {
    display: 'flex',
    flexDirection: getDirection(),
    gap: gapValues[gap] || gap,
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap ? 'wrap' : 'nowrap',
    ...style,
  };

  return (
    <div
      className={`responsive-flex flex-${getDirection()} ${className}`}
      style={flexStyle}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * ResponsiveStack Component
 * Vertical stack with responsive spacing
 */
export function ResponsiveStack({
  children,
  spacing = 'md',
  divide = false,
  className = '',
  style = {},
  ...props
}) {
  const spacingValues = {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  };

  const stackStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacingValues[spacing] || spacing,
    ...style,
  };

  const divider = divide ? (
    <div style={{ height: '1px', background: 'var(--border-subtle)' }} />
  ) : null;

  return (
    <div
      className={`responsive-stack stack-${spacing} ${className}`}
      style={stackStyle}
      {...props}
    >
      {divider
        ? children.reduce((acc, child, idx) => [
          ...acc,
          <div key={`child-${idx}`}>{child}</div>,
          idx < children.length - 1 ? <div key={`divider-${idx}`}>{divider}</div> : null,
        ].filter(Boolean), [])
        : children}
    </div>
  );
}

/**
 * ResponsiveSection Component
 * Section with responsive padding and layout
 */
export function ResponsiveSection({
  children,
  title,
  titleSize = 'lg',
  spacing = 'lg',
  fullWidth = false,
  className = '',
  style = {},
  ...props
}) {
  const { isMobile } = useResponsive();

  const titleSizes = {
    sm: { mobile: '1.2rem', desktop: '1.4rem' },
    md: { mobile: '1.4rem', desktop: '1.75rem' },
    lg: { mobile: '1.75rem', desktop: '2.25rem' },
    xl: { mobile: '2rem', desktop: '2.75rem' },
  };

  const getTitleSize = () => {
    const sizes = titleSizes[titleSize] || titleSizes.lg;
    return isMobile ? sizes.mobile : sizes.desktop;
  };

  const sectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: `calc(${spacing} * 1.5)`,
    width: fullWidth ? '100%' : 'auto',
    ...style,
  };

  const titleStyle = {
    fontSize: getTitleSize(),
    fontWeight: 700,
    lineHeight: 1.2,
  };

  return (
    <section
      className={`responsive-section section-${titleSize} ${className}`}
      style={sectionStyle}
      {...props}
    >
      {title && <h2 style={titleStyle}>{title}</h2>}
      {children}
    </section>
  );
}

/**
 * ResponsiveAspectRatio Component
 * Maintains aspect ratio while being responsive
 */
export function ResponsiveAspectRatio({
  children,
  ratio = '16 / 9',
  className = '',
  style = {},
  ...props
}) {
  const containerStyle = {
    position: 'relative',
    width: '100%',
    paddingBottom: `${(parseInt(ratio.split('/')[1]) / parseInt(ratio.split('/')[0])) * 100}%`,
    ...style,
  };

  const childStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  return (
    <div
      className={`responsive-aspect-ratio ${className}`}
      style={containerStyle}
      {...props}
    >
      {typeof children === 'string' ? (
        <img src={children} loading="lazy" style={childStyle} alt="" />
      ) : (
        <div style={childStyle}>{children}</div>
      )}
    </div>
  );
}
