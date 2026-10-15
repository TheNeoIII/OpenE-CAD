// SPDX-License-Identifier: MPL-2.0

//! Framework-neutral text placement math for technical CAD labels.
//!
//! This crate deliberately contains no glyph rasterization. It defines where a
//! shaped text run belongs in paper/model space so the final renderer can use
//! glyphon, a custom glyph-atlas path, PDF/SVG, or another backend.

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Point2 {
    pub x: f64,
    pub y: f64,
}

impl Point2 {
    pub const fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TextMetrics {
    pub width_mm: f64,
    pub height_mm: f64,
    /// Distance from the top of the shaped line box to the baseline.
    pub baseline_from_top_mm: f64,
}

impl TextMetrics {
    pub fn normalized(self) -> Self {
        let width = self.width_mm.max(0.0);
        let height = self.height_mm.max(0.0);
        Self {
            width_mm: width,
            height_mm: height,
            baseline_from_top_mm: self.baseline_from_top_mm.clamp(0.0, height),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HorizontalAnchor {
    Left,
    Center,
    Right,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VerticalAnchor {
    Top,
    Middle,
    Baseline,
    Bottom,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrthogonalRotation {
    Deg0,
    Deg90,
    Deg180,
    Deg270,
}

impl OrthogonalRotation {
    pub const fn degrees(self) -> i32 {
        match self {
            Self::Deg0 => 0,
            Self::Deg90 => 90,
            Self::Deg180 => 180,
            Self::Deg270 => 270,
        }
    }

    pub fn rotate_local(self, p: Point2) -> Point2 {
        match self {
            Self::Deg0 => p,
            Self::Deg90 => Point2::new(-p.y, p.x),
            Self::Deg180 => Point2::new(-p.x, -p.y),
            Self::Deg270 => Point2::new(p.y, -p.x),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TextPlacement {
    /// Model/paper-space anchor point.
    pub anchor_mm: Point2,
    pub horizontal: HorizontalAnchor,
    pub vertical: VerticalAnchor,
    pub rotation: OrthogonalRotation,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Bounds2 {
    pub min: Point2,
    pub max: Point2,
}

impl Bounds2 {
    pub fn width(self) -> f64 {
        self.max.x - self.min.x
    }

    pub fn height(self) -> f64 {
        self.max.y - self.min.y
    }
}

fn local_anchor_offset(
    metrics: TextMetrics,
    horizontal: HorizontalAnchor,
    vertical: VerticalAnchor,
) -> Point2 {
    let metrics = metrics.normalized();
    let x = match horizontal {
        HorizontalAnchor::Left => 0.0,
        HorizontalAnchor::Center => metrics.width_mm * 0.5,
        HorizontalAnchor::Right => metrics.width_mm,
    };
    let y = match vertical {
        VerticalAnchor::Top => 0.0,
        VerticalAnchor::Middle => metrics.height_mm * 0.5,
        VerticalAnchor::Baseline => metrics.baseline_from_top_mm,
        VerticalAnchor::Bottom => metrics.height_mm,
    };
    Point2::new(x, y)
}

pub fn transformed_corners(metrics: TextMetrics, placement: TextPlacement) -> [Point2; 4] {
    let metrics = metrics.normalized();
    let anchor_local = local_anchor_offset(metrics, placement.horizontal, placement.vertical);
    let corners = [
        Point2::new(0.0, 0.0),
        Point2::new(metrics.width_mm, 0.0),
        Point2::new(metrics.width_mm, metrics.height_mm),
        Point2::new(0.0, metrics.height_mm),
    ];

    corners.map(|corner| {
        let relative = Point2::new(corner.x - anchor_local.x, corner.y - anchor_local.y);
        let rotated = placement.rotation.rotate_local(relative);
        Point2::new(
            placement.anchor_mm.x + rotated.x,
            placement.anchor_mm.y + rotated.y,
        )
    })
}

pub fn transformed_bounds(metrics: TextMetrics, placement: TextPlacement) -> Bounds2 {
    let corners = transformed_corners(metrics, placement);
    let min_x = corners.iter().map(|p| p.x).fold(f64::INFINITY, f64::min);
    let min_y = corners.iter().map(|p| p.y).fold(f64::INFINITY, f64::min);
    let max_x = corners
        .iter()
        .map(|p| p.x)
        .fold(f64::NEG_INFINITY, f64::max);
    let max_y = corners
        .iter()
        .map(|p| p.y)
        .fold(f64::NEG_INFINITY, f64::max);
    Bounds2 {
        min: Point2::new(min_x, min_y),
        max: Point2::new(max_x, max_y),
    }
}

/// Decides whether a paper-space text height should be rendered at the current
/// viewport scale. This prevents unreadable sub-pixel labels from becoming a
/// gray text carpet when a whole drawing is zoomed out.
pub fn visible_at_zoom(height_mm: f64, pixels_per_mm: f64, min_screen_px: f64) -> bool {
    height_mm.max(0.0) * pixels_per_mm.max(0.0) >= min_screen_px.max(0.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn metrics() -> TextMetrics {
        TextMetrics {
            width_mm: 20.0,
            height_mm: 4.0,
            baseline_from_top_mm: 3.0,
        }
    }

    fn approx(a: f64, b: f64) {
        assert!((a - b).abs() < 1.0e-9, "{a} != {b}");
    }

    #[test]
    fn left_top_zero_degree_starts_at_anchor() {
        let placement = TextPlacement {
            anchor_mm: Point2::new(100.0, 50.0),
            horizontal: HorizontalAnchor::Left,
            vertical: VerticalAnchor::Top,
            rotation: OrthogonalRotation::Deg0,
        };
        let corners = transformed_corners(metrics(), placement);
        assert_eq!(corners[0], Point2::new(100.0, 50.0));
        assert_eq!(corners[2], Point2::new(120.0, 54.0));
    }

    #[test]
    fn center_middle_keeps_anchor_at_box_center() {
        let placement = TextPlacement {
            anchor_mm: Point2::new(30.0, 40.0),
            horizontal: HorizontalAnchor::Center,
            vertical: VerticalAnchor::Middle,
            rotation: OrthogonalRotation::Deg0,
        };
        let bounds = transformed_bounds(metrics(), placement);
        approx((bounds.min.x + bounds.max.x) * 0.5, 30.0);
        approx((bounds.min.y + bounds.max.y) * 0.5, 40.0);
    }

    #[test]
    fn ninety_degrees_swaps_extents() {
        let placement = TextPlacement {
            anchor_mm: Point2::new(0.0, 0.0),
            horizontal: HorizontalAnchor::Center,
            vertical: VerticalAnchor::Middle,
            rotation: OrthogonalRotation::Deg90,
        };
        let bounds = transformed_bounds(metrics(), placement);
        approx(bounds.width(), 4.0);
        approx(bounds.height(), 20.0);
    }

    #[test]
    fn right_baseline_anchor_is_preserved_after_rotation() {
        let placement = TextPlacement {
            anchor_mm: Point2::new(12.0, 18.0),
            horizontal: HorizontalAnchor::Right,
            vertical: VerticalAnchor::Baseline,
            rotation: OrthogonalRotation::Deg270,
        };
        let metrics = metrics();
        let anchor_local = local_anchor_offset(metrics, placement.horizontal, placement.vertical);
        let transformed_anchor = placement.rotation.rotate_local(Point2::new(
            anchor_local.x - anchor_local.x,
            anchor_local.y - anchor_local.y,
        ));
        approx(placement.anchor_mm.x + transformed_anchor.x, 12.0);
        approx(placement.anchor_mm.y + transformed_anchor.y, 18.0);
    }

    #[test]
    fn lod_threshold_is_screen_space_based() {
        assert!(!visible_at_zoom(2.5, 3.0, 9.0));
        assert!(visible_at_zoom(2.5, 4.0, 9.0));
    }

    #[test]
    fn baseline_is_clamped_to_line_box() {
        let placement = TextPlacement {
            anchor_mm: Point2::new(0.0, 0.0),
            horizontal: HorizontalAnchor::Left,
            vertical: VerticalAnchor::Baseline,
            rotation: OrthogonalRotation::Deg0,
        };
        let bounds = transformed_bounds(
            TextMetrics {
                width_mm: 10.0,
                height_mm: 3.0,
                baseline_from_top_mm: 99.0,
            },
            placement,
        );
        approx(bounds.min.y, -3.0);
        approx(bounds.max.y, 0.0);
    }
}
