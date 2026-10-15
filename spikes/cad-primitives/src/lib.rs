// SPDX-License-Identifier: MPL-2.0

//! Experimental analytic CAD primitives for the OpenE-CAD S2 renderer spike.
//!
//! Important: the persistent project model should keep circles/arcs analytically.
//! Tessellation is derived renderer/export data only.

use std::f64::consts::{PI, TAU};

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Point2 {
    pub x: f64,
    pub y: f64,
}

impl Point2 {
    pub const fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    pub fn distance(self, other: Self) -> f64 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        (dx * dx + dy * dy).sqrt()
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Circle {
    pub center: Point2,
    pub radius_mm: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Arc {
    pub center: Point2,
    pub radius_mm: f64,
    /// Mathematical angle in degrees. 0° points to +X.
    pub start_deg: f64,
    /// Signed sweep in degrees. Positive is counter-clockwise in model space.
    pub sweep_deg: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Ellipse {
    pub center: Point2,
    pub radius_x_mm: f64,
    pub radius_y_mm: f64,
    pub rotation_deg: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CubicBezier {
    pub p0: Point2,
    pub p1: Point2,
    pub p2: Point2,
    pub p3: Point2,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TessellationOptions {
    /// Maximum permitted radial deviation from the analytic primitive in mm.
    pub chord_error_mm: f64,
    pub min_segments_full_circle: usize,
    pub max_segments_full_circle: usize,
}

impl Default for TessellationOptions {
    fn default() -> Self {
        Self {
            chord_error_mm: 0.02,
            min_segments_full_circle: 16,
            max_segments_full_circle: 4096,
        }
    }
}

impl TessellationOptions {
    pub fn validate(self) -> Self {
        Self {
            chord_error_mm: self.chord_error_mm.max(1.0e-6),
            min_segments_full_circle: self.min_segments_full_circle.max(4),
            max_segments_full_circle: self
                .max_segments_full_circle
                .max(self.min_segments_full_circle.max(4)),
        }
    }
}

fn point_on_circle(center: Point2, radius: f64, angle_rad: f64) -> Point2 {
    Point2::new(
        center.x + radius * angle_rad.cos(),
        center.y + radius * angle_rad.sin(),
    )
}

fn full_circle_segment_count(radius_mm: f64, options: TessellationOptions) -> usize {
    let options = options.validate();
    let radius = radius_mm.abs();
    if radius <= 1.0e-12 {
        return options.min_segments_full_circle;
    }

    // Sagitta e = r * (1 - cos(theta/2)). Solve for theta.
    let error = options.chord_error_mm.min(radius * 0.999_999);
    let cos_half = (1.0 - error / radius).clamp(-1.0, 1.0);
    let max_step = 2.0 * cos_half.acos();
    let estimated = if max_step.is_finite() && max_step > 1.0e-12 {
        (TAU / max_step).ceil() as usize
    } else {
        options.max_segments_full_circle
    };

    estimated.clamp(
        options.min_segments_full_circle,
        options.max_segments_full_circle,
    )
}

pub fn tessellate_circle(circle: Circle, options: TessellationOptions) -> Vec<Point2> {
    let radius = circle.radius_mm.abs();
    let segments = full_circle_segment_count(radius, options);
    let mut out = Vec::with_capacity(segments + 1);
    for i in 0..=segments {
        let angle = i as f64 / segments as f64 * TAU;
        out.push(point_on_circle(circle.center, radius, angle));
    }
    out
}

pub fn tessellate_arc(arc: Arc, options: TessellationOptions) -> Vec<Point2> {
    let radius = arc.radius_mm.abs();
    let sweep_rad = arc.sweep_deg.to_radians();
    let start_rad = arc.start_deg.to_radians();

    if sweep_rad.abs() <= 1.0e-12 {
        return vec![point_on_circle(arc.center, radius, start_rad)];
    }

    let full = full_circle_segment_count(radius, options);
    let fraction = (sweep_rad.abs() / TAU).clamp(0.0, 1.0e6);
    let segments = ((full as f64 * fraction).ceil() as usize).max(1);
    let mut out = Vec::with_capacity(segments + 1);
    for i in 0..=segments {
        let t = i as f64 / segments as f64;
        out.push(point_on_circle(
            arc.center,
            radius,
            start_rad + sweep_rad * t,
        ));
    }
    out
}

pub fn tessellate_ellipse(ellipse: Ellipse, segments: usize) -> Vec<Point2> {
    let segments = segments.max(8);
    let rotation = ellipse.rotation_deg.to_radians();
    let (sin_r, cos_r) = rotation.sin_cos();
    let rx = ellipse.radius_x_mm.abs();
    let ry = ellipse.radius_y_mm.abs();
    let mut out = Vec::with_capacity(segments + 1);

    for i in 0..=segments {
        let a = i as f64 / segments as f64 * TAU;
        let local_x = rx * a.cos();
        let local_y = ry * a.sin();
        out.push(Point2::new(
            ellipse.center.x + local_x * cos_r - local_y * sin_r,
            ellipse.center.y + local_x * sin_r + local_y * cos_r,
        ));
    }
    out
}

fn midpoint(a: Point2, b: Point2) -> Point2 {
    Point2::new((a.x + b.x) * 0.5, (a.y + b.y) * 0.5)
}

fn point_line_distance(p: Point2, a: Point2, b: Point2) -> f64 {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let denom = dx * dx + dy * dy;
    if denom <= 1.0e-20 {
        return p.distance(a);
    }
    let t = (((p.x - a.x) * dx + (p.y - a.y) * dy) / denom).clamp(0.0, 1.0);
    let projection = Point2::new(a.x + dx * t, a.y + dy * t);
    p.distance(projection)
}

pub fn tessellate_cubic_bezier(
    curve: CubicBezier,
    flatness_mm: f64,
    max_depth: u8,
) -> Vec<Point2> {
    fn recurse(
        p0: Point2,
        p1: Point2,
        p2: Point2,
        p3: Point2,
        flatness: f64,
        depth: u8,
        max_depth: u8,
        out: &mut Vec<Point2>,
    ) {
        let d1 = point_line_distance(p1, p0, p3);
        let d2 = point_line_distance(p2, p0, p3);
        if depth >= max_depth || d1.max(d2) <= flatness {
            out.push(p3);
            return;
        }

        let p01 = midpoint(p0, p1);
        let p12 = midpoint(p1, p2);
        let p23 = midpoint(p2, p3);
        let p012 = midpoint(p01, p12);
        let p123 = midpoint(p12, p23);
        let p0123 = midpoint(p012, p123);

        recurse(p0, p01, p012, p0123, flatness, depth + 1, max_depth, out);
        recurse(p0123, p123, p23, p3, flatness, depth + 1, max_depth, out);
    }

    let mut out = vec![curve.p0];
    recurse(
        curve.p0,
        curve.p1,
        curve.p2,
        curve.p3,
        flatness_mm.max(1.0e-6),
        0,
        max_depth.max(1),
        &mut out,
    );
    out
}

pub fn polyline_to_segments(points: &[Point2]) -> Vec<(Point2, Point2)> {
    points.windows(2).map(|w| (w[0], w[1])).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx(a: f64, b: f64, eps: f64) {
        assert!((a - b).abs() <= eps, "{a} != {b} (eps {eps})");
    }

    #[test]
    fn circle_is_closed() {
        let points = tessellate_circle(
            Circle {
                center: Point2::new(10.0, -4.0),
                radius_mm: 12.5,
            },
            TessellationOptions::default(),
        );
        assert!(points.len() >= 17);
        assert!(points.first().unwrap().distance(*points.last().unwrap()) < 1.0e-9);
    }

    #[test]
    fn quarter_arc_has_exact_endpoints() {
        let points = tessellate_arc(
            Arc {
                center: Point2::new(5.0, 5.0),
                radius_mm: 10.0,
                start_deg: 0.0,
                sweep_deg: 90.0,
            },
            TessellationOptions::default(),
        );
        let first = points.first().unwrap();
        let last = points.last().unwrap();
        approx(first.x, 15.0, 1.0e-9);
        approx(first.y, 5.0, 1.0e-9);
        approx(last.x, 5.0, 1.0e-9);
        approx(last.y, 15.0, 1.0e-9);
    }

    #[test]
    fn negative_arc_sweeps_clockwise() {
        let points = tessellate_arc(
            Arc {
                center: Point2::new(0.0, 0.0),
                radius_mm: 10.0,
                start_deg: 90.0,
                sweep_deg: -90.0,
            },
            TessellationOptions::default(),
        );
        let last = points.last().unwrap();
        approx(last.x, 10.0, 1.0e-9);
        approx(last.y, 0.0, 1.0e-9);
    }

    #[test]
    fn tighter_tolerance_produces_more_segments() {
        let circle = Circle {
            center: Point2::new(0.0, 0.0),
            radius_mm: 50.0,
        };
        let coarse = tessellate_circle(
            circle,
            TessellationOptions {
                chord_error_mm: 0.5,
                ..Default::default()
            },
        );
        let fine = tessellate_circle(
            circle,
            TessellationOptions {
                chord_error_mm: 0.01,
                ..Default::default()
            },
        );
        assert!(fine.len() > coarse.len());
    }

    #[test]
    fn ellipse_rotation_preserves_centered_extents() {
        let points = tessellate_ellipse(
            Ellipse {
                center: Point2::new(10.0, 20.0),
                radius_x_mm: 8.0,
                radius_y_mm: 3.0,
                rotation_deg: 90.0,
            },
            64,
        );
        let min_x = points.iter().map(|p| p.x).fold(f64::INFINITY, f64::min);
        let max_x = points.iter().map(|p| p.x).fold(f64::NEG_INFINITY, f64::max);
        let min_y = points.iter().map(|p| p.y).fold(f64::INFINITY, f64::min);
        let max_y = points.iter().map(|p| p.y).fold(f64::NEG_INFINITY, f64::max);
        approx((min_x + max_x) * 0.5, 10.0, 1.0e-9);
        approx((min_y + max_y) * 0.5, 20.0, 1.0e-9);
        approx((max_x - min_x) * 0.5, 3.0, 1.0e-6);
        approx((max_y - min_y) * 0.5, 8.0, 1.0e-6);
    }

    #[test]
    fn bezier_keeps_exact_endpoints_and_subdivides() {
        let curve = CubicBezier {
            p0: Point2::new(0.0, 0.0),
            p1: Point2::new(10.0, 20.0),
            p2: Point2::new(20.0, -20.0),
            p3: Point2::new(30.0, 0.0),
        };
        let points = tessellate_cubic_bezier(curve, 0.05, 16);
        assert_eq!(points.first().copied(), Some(curve.p0));
        assert_eq!(points.last().copied(), Some(curve.p3));
        assert!(points.len() > 4);
    }

    #[test]
    fn degenerate_arc_returns_one_point() {
        let points = tessellate_arc(
            Arc {
                center: Point2::new(1.0, 2.0),
                radius_mm: 5.0,
                start_deg: 30.0,
                sweep_deg: 0.0,
            },
            TessellationOptions::default(),
        );
        assert_eq!(points.len(), 1);
        approx(points[0].x, 1.0 + 5.0 * (PI / 6.0).cos(), 1.0e-9);
        approx(points[0].y, 2.0 + 5.0 * (PI / 6.0).sin(), 1.0e-9);
    }
}
