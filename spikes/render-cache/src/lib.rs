// SPDX-License-Identifier: MPL-2.0

//! Experimental partial invalidation model for the OpenE-CAD RenderScene.
//!
//! Goal: camera movement and transient interaction must not force a rebuild of
//! persistent world geometry. Only affected render layers become dirty.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u16)]
pub enum RenderLayer {
    DocumentSurface = 1 << 0,
    Grid = 1 << 1,
    StaticGeometry = 1 << 2,
    DynamicWorld = 1 << 3,
    TechnicalText = 1 << 4,
    InteractionOverlay = 1 << 5,
}

impl RenderLayer {
    pub const ALL: [Self; 6] = [
        Self::DocumentSurface,
        Self::Grid,
        Self::StaticGeometry,
        Self::DynamicWorld,
        Self::TechnicalText,
        Self::InteractionOverlay,
    ];

    const fn bit(self) -> u16 {
        self as u16
    }
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct DirtyLayers(u16);

impl DirtyLayers {
    pub const NONE: Self = Self(0);

    pub fn all() -> Self {
        let mut value = 0;
        let mut i = 0;
        while i < RenderLayer::ALL.len() {
            value |= RenderLayer::ALL[i] as u16;
            i += 1;
        }
        Self(value)
    }

    pub const fn from_layer(layer: RenderLayer) -> Self {
        Self(layer.bit())
    }

    pub const fn contains(self, layer: RenderLayer) -> bool {
        self.0 & layer.bit() != 0
    }

    pub const fn is_empty(self) -> bool {
        self.0 == 0
    }

    pub fn insert(&mut self, layer: RenderLayer) {
        self.0 |= layer.bit();
    }

    pub fn union(mut self, other: Self) -> Self {
        self.0 |= other.0;
        self
    }

    pub const fn bits(self) -> u16 {
        self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChangeKind {
    /// Pan/zoom only changes the camera uniform / projection.
    CameraChanged,
    /// Window size/DPI changed. World buffers remain valid, but screen-space
    /// overlays and text projection need re-preparation.
    ViewportChanged,
    /// Paper size, page background, frame or document surface changed.
    DocumentChanged,
    /// Grid spacing/visibility/style changed.
    GridChanged,
    /// A persisted symbol/line/path moved or changed shape.
    ObjectGeometryChanged,
    /// Text content/style/anchor changed without altering object geometry.
    ObjectTextChanged,
    /// A transient world-space preview changed, e.g. drag ghost.
    DynamicWorldChanged,
    /// Selection, hover, snap, junction or wire-preview state changed.
    InteractionChanged,
    /// Potential/color/style profile changed.
    TechnicalStyleChanged,
    /// Structural model edit may add/remove geometry and generated labels.
    ModelStructureChanged,
    /// Theme changes document, grid, geometry and text colors.
    ThemeChanged,
}

pub fn layers_for_change(change: ChangeKind) -> DirtyLayers {
    use ChangeKind::*;
    use RenderLayer::*;

    match change {
        CameraChanged => DirtyLayers::NONE,
        ViewportChanged => DirtyLayers::from_layer(TechnicalText)
            .union(DirtyLayers::from_layer(InteractionOverlay)),
        DocumentChanged => DirtyLayers::from_layer(DocumentSurface),
        GridChanged => DirtyLayers::from_layer(Grid),
        ObjectGeometryChanged => DirtyLayers::from_layer(StaticGeometry)
            .union(DirtyLayers::from_layer(TechnicalText))
            .union(DirtyLayers::from_layer(InteractionOverlay)),
        ObjectTextChanged => DirtyLayers::from_layer(TechnicalText),
        DynamicWorldChanged => DirtyLayers::from_layer(DynamicWorld),
        InteractionChanged => DirtyLayers::from_layer(InteractionOverlay),
        TechnicalStyleChanged => DirtyLayers::from_layer(StaticGeometry)
            .union(DirtyLayers::from_layer(TechnicalText)),
        ModelStructureChanged => DirtyLayers::from_layer(StaticGeometry)
            .union(DirtyLayers::from_layer(DynamicWorld))
            .union(DirtyLayers::from_layer(TechnicalText))
            .union(DirtyLayers::from_layer(InteractionOverlay)),
        ThemeChanged => DirtyLayers::all(),
    }
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct LayerGenerations {
    pub document_surface: u64,
    pub grid: u64,
    pub static_geometry: u64,
    pub dynamic_world: u64,
    pub technical_text: u64,
    pub interaction_overlay: u64,
}

impl LayerGenerations {
    pub fn generation(self, layer: RenderLayer) -> u64 {
        match layer {
            RenderLayer::DocumentSurface => self.document_surface,
            RenderLayer::Grid => self.grid,
            RenderLayer::StaticGeometry => self.static_geometry,
            RenderLayer::DynamicWorld => self.dynamic_world,
            RenderLayer::TechnicalText => self.technical_text,
            RenderLayer::InteractionOverlay => self.interaction_overlay,
        }
    }

    fn bump(&mut self, layer: RenderLayer) {
        let target = match layer {
            RenderLayer::DocumentSurface => &mut self.document_surface,
            RenderLayer::Grid => &mut self.grid,
            RenderLayer::StaticGeometry => &mut self.static_geometry,
            RenderLayer::DynamicWorld => &mut self.dynamic_world,
            RenderLayer::TechnicalText => &mut self.technical_text,
            RenderLayer::InteractionOverlay => &mut self.interaction_overlay,
        };
        *target = target.wrapping_add(1);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RenderSceneInvalidation {
    dirty: DirtyLayers,
    generations: LayerGenerations,
}

impl Default for RenderSceneInvalidation {
    fn default() -> Self {
        Self {
            dirty: DirtyLayers::all(),
            generations: LayerGenerations::default(),
        }
    }
}

impl RenderSceneInvalidation {
    pub fn invalidate(&mut self, change: ChangeKind) {
        let layers = layers_for_change(change);
        for layer in RenderLayer::ALL {
            if layers.contains(layer) {
                self.dirty.insert(layer);
                self.generations.bump(layer);
            }
        }
    }

    pub fn dirty(self) -> DirtyLayers {
        self.dirty
    }

    pub fn generations(self) -> LayerGenerations {
        self.generations
    }

    pub fn clear_layer(&mut self, layer: RenderLayer) {
        self.dirty.0 &= !layer.bit();
    }

    pub fn clear_all(&mut self) {
        self.dirty = DirtyLayers::NONE;
    }

    pub fn take_dirty(&mut self) -> DirtyLayers {
        let current = self.dirty;
        self.dirty = DirtyLayers::NONE;
        current
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn camera_change_does_not_dirty_world_layers() {
        let layers = layers_for_change(ChangeKind::CameraChanged);
        assert!(layers.is_empty());
    }

    #[test]
    fn selection_only_dirties_interaction_overlay() {
        let layers = layers_for_change(ChangeKind::InteractionChanged);
        assert!(layers.contains(RenderLayer::InteractionOverlay));
        assert!(!layers.contains(RenderLayer::StaticGeometry));
        assert!(!layers.contains(RenderLayer::TechnicalText));
    }

    #[test]
    fn text_change_does_not_rebuild_geometry() {
        let layers = layers_for_change(ChangeKind::ObjectTextChanged);
        assert!(layers.contains(RenderLayer::TechnicalText));
        assert!(!layers.contains(RenderLayer::StaticGeometry));
        assert!(!layers.contains(RenderLayer::Grid));
    }

    #[test]
    fn geometry_change_updates_geometry_text_and_interaction() {
        let layers = layers_for_change(ChangeKind::ObjectGeometryChanged);
        assert!(layers.contains(RenderLayer::StaticGeometry));
        assert!(layers.contains(RenderLayer::TechnicalText));
        assert!(layers.contains(RenderLayer::InteractionOverlay));
        assert!(!layers.contains(RenderLayer::Grid));
    }

    #[test]
    fn theme_invalidates_every_render_layer() {
        let layers = layers_for_change(ChangeKind::ThemeChanged);
        for layer in RenderLayer::ALL {
            assert!(layers.contains(layer));
        }
    }

    #[test]
    fn generations_only_move_for_affected_layers() {
        let mut invalidation = RenderSceneInvalidation::default();
        invalidation.clear_all();
        let before = invalidation.generations();
        invalidation.invalidate(ChangeKind::ObjectTextChanged);
        let after = invalidation.generations();
        assert_eq!(after.static_geometry, before.static_geometry);
        assert_eq!(after.technical_text, before.technical_text + 1);
    }

    #[test]
    fn take_dirty_resets_pending_mask() {
        let mut invalidation = RenderSceneInvalidation::default();
        let first = invalidation.take_dirty();
        assert!(!first.is_empty());
        assert!(invalidation.dirty().is_empty());
    }
}
