// SPDX-License-Identifier: MPL-2.0

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Point {
    pub x: f32,
    pub y: f32,
}

impl Point {
    pub const fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SnapSettings {
    pub enabled: bool,
    pub step_mm: f32,
}

impl SnapSettings {
    pub fn snap(self, point: Point) -> Point {
        if !self.enabled || self.step_mm <= 0.0 {
            return point;
        }
        Point::new(
            (point.x / self.step_mm).round() * self.step_mm,
            (point.y / self.step_mm).round() * self.step_mm,
        )
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RectHandle {
    TopLeft,
    TopRight,
    BottomRight,
    BottomLeft,
}

impl RectHandle {
    pub const ALL: [Self; 4] = [
        Self::TopLeft,
        Self::TopRight,
        Self::BottomRight,
        Self::BottomLeft,
    ];

    pub const fn opposite(self) -> Self {
        match self {
            Self::TopLeft => Self::BottomRight,
            Self::TopRight => Self::BottomLeft,
            Self::BottomRight => Self::TopLeft,
            Self::BottomLeft => Self::TopRight,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SelectionRect {
    pub min: Point,
    pub max: Point,
}

impl SelectionRect {
    pub fn from_points(a: Point, b: Point) -> Self {
        Self {
            min: Point::new(a.x.min(b.x), a.y.min(b.y)),
            max: Point::new(a.x.max(b.x), a.y.max(b.y)),
        }
    }

    pub const fn corner(self, handle: RectHandle) -> Point {
        match handle {
            RectHandle::TopLeft => Point::new(self.min.x, self.min.y),
            RectHandle::TopRight => Point::new(self.max.x, self.min.y),
            RectHandle::BottomRight => Point::new(self.max.x, self.max.y),
            RectHandle::BottomLeft => Point::new(self.min.x, self.max.y),
        }
    }

    pub fn hit_handle(
        self,
        raw_world: Point,
        pixels_per_mm: f32,
        hit_radius_px: f32,
    ) -> Option<RectHandle> {
        let radius_mm = hit_radius_px / pixels_per_mm.max(0.000_1);
        let radius_sq = radius_mm * radius_mm;
        RectHandle::ALL
            .into_iter()
            .filter_map(|handle| {
                let corner = self.corner(handle);
                let dx = corner.x - raw_world.x;
                let dy = corner.y - raw_world.y;
                let distance_sq = dx * dx + dy * dy;
                (distance_sq <= radius_sq).then_some((handle, distance_sq))
            })
            .min_by(|a, b| a.1.total_cmp(&b.1))
            .map(|(handle, _)| handle)
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum DragMode {
    Create { anchor: Point },
    Resize { opposite_anchor: Point },
}

#[derive(Debug, Default, Clone, Copy, PartialEq)]
pub struct SelectionInteraction {
    pub rect: Option<SelectionRect>,
    drag: Option<DragMode>,
}

impl SelectionInteraction {
    pub fn begin_create(&mut self, raw_world: Point, snap: SnapSettings) {
        let p = snap.snap(raw_world);
        self.rect = Some(SelectionRect::from_points(p, p));
        self.drag = Some(DragMode::Create { anchor: p });
    }

    pub fn begin_resize(&mut self, handle: RectHandle) -> bool {
        let Some(rect) = self.rect else {
            return false;
        };
        self.drag = Some(DragMode::Resize {
            opposite_anchor: rect.corner(handle.opposite()),
        });
        true
    }

    pub fn update_drag(&mut self, raw_world: Point, snap: SnapSettings) {
        let Some(mode) = self.drag else {
            return;
        };
        let p = snap.snap(raw_world);
        let anchor = match mode {
            DragMode::Create { anchor } => anchor,
            DragMode::Resize { opposite_anchor } => opposite_anchor,
        };
        self.rect = Some(SelectionRect::from_points(anchor, p));
    }

    pub fn finish_drag(&mut self, raw_world: Point, snap: SnapSettings) {
        self.update_drag(raw_world, snap);
        self.drag = None;
    }

    pub fn cancel_drag(&mut self) {
        self.drag = None;
    }

    pub const fn is_dragging(self) -> bool {
        self.drag.is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SNAP_5: SnapSettings = SnapSettings {
        enabled: true,
        step_mm: 5.0,
    };

    #[test]
    fn selection_release_uses_same_snap_as_preview() {
        let mut interaction = SelectionInteraction::default();
        interaction.begin_create(Point::new(11.8, 12.2), SNAP_5);
        interaction.update_drag(Point::new(43.1, 37.7), SNAP_5);
        assert_eq!(
            interaction.rect,
            Some(SelectionRect {
                min: Point::new(10.0, 10.0),
                max: Point::new(45.0, 40.0),
            })
        );

        // Release at another non-grid coordinate. The committed rectangle must
        // still end on the exact same snapped point that the overlay shows.
        interaction.finish_drag(Point::new(47.3, 42.1), SNAP_5);
        assert_eq!(
            interaction.rect,
            Some(SelectionRect {
                min: Point::new(10.0, 10.0),
                max: Point::new(45.0, 40.0),
            })
        );
    }

    #[test]
    fn snap_disabled_preserves_raw_coordinates() {
        let mut interaction = SelectionInteraction::default();
        let off = SnapSettings {
            enabled: false,
            step_mm: 5.0,
        };
        interaction.begin_create(Point::new(1.25, 2.5), off);
        interaction.finish_drag(Point::new(7.75, 9.125), off);
        assert_eq!(
            interaction.rect,
            Some(SelectionRect::from_points(
                Point::new(1.25, 2.5),
                Point::new(7.75, 9.125)
            ))
        );
    }

    #[test]
    fn resize_keeps_opposite_corner_fixed_and_snaps_active_corner() {
        let mut interaction = SelectionInteraction {
            rect: Some(SelectionRect::from_points(
                Point::new(10.0, 10.0),
                Point::new(40.0, 30.0),
            )),
            drag: None,
        };
        assert!(interaction.begin_resize(RectHandle::TopLeft));
        interaction.finish_drag(Point::new(17.7, 13.2), SNAP_5);
        assert_eq!(
            interaction.rect,
            Some(SelectionRect::from_points(
                Point::new(20.0, 15.0),
                Point::new(40.0, 30.0)
            ))
        );
    }

    #[test]
    fn resize_can_cross_over_opposite_corner() {
        let mut interaction = SelectionInteraction {
            rect: Some(SelectionRect::from_points(
                Point::new(10.0, 10.0),
                Point::new(40.0, 30.0),
            )),
            drag: None,
        };
        assert!(interaction.begin_resize(RectHandle::TopLeft));
        interaction.finish_drag(Point::new(52.0, 42.0), SNAP_5);
        assert_eq!(
            interaction.rect,
            Some(SelectionRect::from_points(
                Point::new(40.0, 30.0),
                Point::new(50.0, 40.0)
            ))
        );
    }

    #[test]
    fn handle_hit_radius_is_screen_space_based() {
        let rect = SelectionRect::from_points(Point::new(10.0, 10.0), Point::new(40.0, 30.0));

        // At 2 px/mm an 8 px hit radius equals 4 mm.
        assert_eq!(
            rect.hit_handle(Point::new(13.0, 12.0), 2.0, 8.0),
            Some(RectHandle::TopLeft)
        );
        assert_eq!(rect.hit_handle(Point::new(15.0, 15.0), 2.0, 8.0), None);

        // At 20 px/mm the same 8 px hit radius is only 0.4 mm.
        assert_eq!(
            rect.hit_handle(Point::new(10.3, 10.2), 20.0, 8.0),
            Some(RectHandle::TopLeft)
        );
        assert_eq!(rect.hit_handle(Point::new(11.0, 10.0), 20.0, 8.0), None);
    }
}
