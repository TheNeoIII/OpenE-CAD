// SPDX-License-Identifier: MPL-2.0

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Persistent OpenE-CAD object identity used by the spike.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct ObjectId(pub Uuid);

impl ObjectId {
    pub fn new_v7() -> Self {
        Self(Uuid::now_v7())
    }
}

/// Persistent geometric length in micrometres.
///
/// 1 mm = 1_000 µm. Persistent CAD data must not use screen pixels or floats.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Micrometre(pub i64);

impl Micrometre {
    pub const PER_MM: i64 = 1_000;

    pub const fn from_mm(mm: i64) -> Self {
        Self(mm * Self::PER_MM)
    }

    pub const fn from_um(um: i64) -> Self {
        Self(um)
    }

    pub const fn as_um(self) -> i64 {
        self.0
    }

    pub fn as_mm_f64(self) -> f64 {
        self.0 as f64 / Self::PER_MM as f64
    }
}

impl std::ops::Add for Micrometre {
    type Output = Self;

    fn add(self, rhs: Self) -> Self::Output {
        Self(self.0 + rhs.0)
    }
}

impl std::ops::Sub for Micrometre {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self::Output {
        Self(self.0 - rhs.0)
    }
}

/// Teilungseinheit represented in thousandths of a TE.
///
/// 1 TE = 1000 milli-TE, 0.5 TE = 500 milli-TE.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct MilliTe(pub i32);

impl MilliTe {
    pub const ONE_TE: Self = Self(1_000);
    pub const HALF_TE: Self = Self(500);

    pub const fn from_milli_te(value: i32) -> Self {
        Self(value)
    }

    pub const fn as_milli_te(self) -> i32 {
        self.0
    }
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct PaperPoint {
    pub x: Micrometre,
    pub y: Micrometre,
}

impl PaperPoint {
    pub const fn new(x: Micrometre, y: Micrometre) -> Self {
        Self { x, y }
    }

    pub fn translated(self, dx: Micrometre, dy: Micrometre) -> Self {
        Self {
            x: self.x + dx,
            y: self.y + dy,
        }
    }
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct ModelPoint {
    pub x: Micrometre,
    pub y: Micrometre,
}

impl ModelPoint {
    pub const fn new(x: Micrometre, y: Micrometre) -> Self {
        Self { x, y }
    }
}

/// Ephemeral screen-space value. Never persisted as project geometry.
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct ScreenPoint {
    pub x_px: f32,
    pub y_px: f32,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct RectUm {
    pub min: PaperPoint,
    pub max: PaperPoint,
}

impl RectUm {
    pub fn normalized(a: PaperPoint, b: PaperPoint) -> Self {
        Self {
            min: PaperPoint {
                x: Micrometre(a.x.0.min(b.x.0)),
                y: Micrometre(a.y.0.min(b.y.0)),
            },
            max: PaperPoint {
                x: Micrometre(a.x.0.max(b.x.0)),
                y: Micrometre(a.y.0.max(b.y.0)),
            },
        }
    }

    pub fn contains(&self, p: PaperPoint) -> bool {
        p.x >= self.min.x && p.x <= self.max.x && p.y >= self.min.y && p.y <= self.max.y
    }

    pub fn union(self, other: Self) -> Self {
        Self {
            min: PaperPoint {
                x: Micrometre(self.min.x.0.min(other.min.x.0)),
                y: Micrometre(self.min.y.0.min(other.min.y.0)),
            },
            max: PaperPoint {
                x: Micrometre(self.max.x.0.max(other.max.x.0)),
                y: Micrometre(self.max.y.0.max(other.max.y.0)),
            },
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Grid {
    pub step: Micrometre,
}

impl Grid {
    pub fn new(step: Micrometre) -> Self {
        assert!(step.0 > 0, "grid step must be positive");
        Self { step }
    }

    pub fn snap_scalar(&self, value: Micrometre) -> Micrometre {
        let step = self.step.0;
        let q = value.0.div_euclid(step);
        let r = value.0.rem_euclid(step);
        if r * 2 < step {
            Micrometre(q * step)
        } else {
            Micrometre((q + 1) * step)
        }
    }

    pub fn snap_point(&self, p: PaperPoint) -> PaperPoint {
        PaperPoint {
            x: self.snap_scalar(p.x),
            y: self.snap_scalar(p.y),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OrthogonalRotation {
    Deg0,
    Deg90,
    Deg180,
    Deg270,
}

impl OrthogonalRotation {
    pub fn rotate_around_origin(self, p: PaperPoint) -> PaperPoint {
        match self {
            Self::Deg0 => p,
            Self::Deg90 => PaperPoint::new(Micrometre(-p.y.0), p.x),
            Self::Deg180 => PaperPoint::new(Micrometre(-p.x.0), Micrometre(-p.y.0)),
            Self::Deg270 => PaperPoint::new(p.y, Micrometre(-p.x.0)),
        }
    }
}

/// Free rotation stored as integer micro-degrees.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct MicroDegree(pub i32);

impl MicroDegree {
    pub const FULL_TURN: i32 = 360_000_000;

    pub fn normalized(self) -> Self {
        Self(self.0.rem_euclid(Self::FULL_TURN))
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GeometryFixture {
    pub id: ObjectId,
    pub origin: PaperPoint,
    pub bounds: RectUm,
    pub grid: Grid,
    pub width: MilliTe,
    pub angle: MicroDegree,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uuid_v7_is_used() {
        let id = ObjectId::new_v7();
        assert_eq!(id.0.get_version_num(), 7);
    }

    #[test]
    fn two_point_five_mm_grid_is_exact_over_many_steps() {
        let step = Micrometre::from_um(2_500);
        let mut value = Micrometre::from_um(0);
        for _ in 0..10_000 {
            value = value + step;
        }
        assert_eq!(value, Micrometre::from_um(25_000_000));
    }

    #[test]
    fn snapping_handles_negative_coordinates_deterministically() {
        let grid = Grid::new(Micrometre::from_um(2_500));
        assert_eq!(grid.snap_scalar(Micrometre::from_um(3_400)), Micrometre::from_um(2_500));
        assert_eq!(grid.snap_scalar(Micrometre::from_um(-3_400)), Micrometre::from_um(-2_500));
        assert_eq!(grid.snap_scalar(Micrometre::from_um(-3_900)), Micrometre::from_um(-5_000));
    }

    #[test]
    fn four_quarter_turns_return_to_origin() {
        let p = PaperPoint::new(Micrometre::from_um(12_345), Micrometre::from_um(-67_890));
        let p = OrthogonalRotation::Deg90.rotate_around_origin(p);
        let p = OrthogonalRotation::Deg90.rotate_around_origin(p);
        let p = OrthogonalRotation::Deg90.rotate_around_origin(p);
        let p = OrthogonalRotation::Deg90.rotate_around_origin(p);
        assert_eq!(p, PaperPoint::new(Micrometre::from_um(12_345), Micrometre::from_um(-67_890)));
    }

    #[test]
    fn rect_union_and_hit_test_are_integer_exact() {
        let a = RectUm::normalized(
            PaperPoint::new(Micrometre::from_mm(0), Micrometre::from_mm(0)),
            PaperPoint::new(Micrometre::from_mm(10), Micrometre::from_mm(10)),
        );
        let b = RectUm::normalized(
            PaperPoint::new(Micrometre::from_mm(8), Micrometre::from_mm(-2)),
            PaperPoint::new(Micrometre::from_mm(20), Micrometre::from_mm(5)),
        );
        let u = a.union(b);
        assert!(u.contains(PaperPoint::new(Micrometre::from_mm(20), Micrometre::from_mm(-2))));
        assert_eq!(u.min.y, Micrometre::from_mm(-2));
        assert_eq!(u.max.x, Micrometre::from_mm(20));
    }

    #[test]
    fn serde_json_roundtrip_is_semantically_identical() {
        let fixture = GeometryFixture {
            id: ObjectId::new_v7(),
            origin: PaperPoint::new(Micrometre::from_mm(17), Micrometre::from_um(2_500)),
            bounds: RectUm::normalized(
                PaperPoint::new(Micrometre::from_mm(0), Micrometre::from_mm(0)),
                PaperPoint::new(Micrometre::from_mm(420), Micrometre::from_mm(297)),
            ),
            grid: Grid::new(Micrometre::from_um(2_500)),
            width: MilliTe::from_milli_te(2_500),
            angle: MicroDegree(12_345_678).normalized(),
        };

        let json = serde_json::to_string_pretty(&fixture).unwrap();
        let decoded: GeometryFixture = serde_json::from_str(&json).unwrap();
        assert_eq!(fixture, decoded);
    }
}
