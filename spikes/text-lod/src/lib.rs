// SPDX-License-Identifier: MPL-2.0

/// Above this zoom all technical text remains visible, regardless of its
/// resulting screen-pixel height. The real Windows test showed that hiding
/// labels already around 75–94 % zoom is too aggressive for ECAD work.
pub const KEEP_ALL_TEXT_AT_OR_ABOVE_ZOOM: f32 = 0.20;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TextPriority {
    /// BMK, terminal identifiers, potential names, cross references.
    Essential,
    /// Function names and other regularly useful engineering labels.
    Normal,
    /// Supplementary article or descriptive text.
    Detail,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TextLodPolicy {
    pub keep_all_at_or_above_zoom: f32,
    pub essential_min_px_below_threshold: f32,
    pub normal_min_px_below_threshold: f32,
    pub detail_min_px_below_threshold: f32,
}

impl Default for TextLodPolicy {
    fn default() -> Self {
        Self {
            keep_all_at_or_above_zoom: KEEP_ALL_TEXT_AT_OR_ABOVE_ZOOM,
            essential_min_px_below_threshold: 4.0,
            normal_min_px_below_threshold: 6.0,
            detail_min_px_below_threshold: 9.0,
        }
    }
}

impl TextLodPolicy {
    pub fn visible(self, zoom: f32, screen_height_px: f32, priority: TextPriority) -> bool {
        if zoom >= self.keep_all_at_or_above_zoom {
            return true;
        }

        let min_px = match priority {
            TextPriority::Essential => self.essential_min_px_below_threshold,
            TextPriority::Normal => self.normal_min_px_below_threshold,
            TextPriority::Detail => self.detail_min_px_below_threshold,
        };
        screen_height_px >= min_px
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_text_stays_visible_at_typical_editor_zoom_levels() {
        let policy = TextLodPolicy::default();
        for zoom in [0.20, 0.25, 0.75, 0.94, 1.0, 4.0] {
            for priority in [
                TextPriority::Essential,
                TextPriority::Normal,
                TextPriority::Detail,
            ] {
                assert!(
                    policy.visible(zoom, 1.0, priority),
                    "text unexpectedly hidden at zoom {zoom}"
                );
            }
        }
    }

    #[test]
    fn below_twenty_percent_lod_can_reduce_detail_density() {
        let policy = TextLodPolicy::default();
        assert!(policy.visible(0.19, 4.0, TextPriority::Essential));
        assert!(!policy.visible(0.19, 4.0, TextPriority::Normal));
        assert!(!policy.visible(0.19, 4.0, TextPriority::Detail));
        assert!(policy.visible(0.19, 6.0, TextPriority::Normal));
        assert!(policy.visible(0.19, 9.0, TextPriority::Detail));
    }

    #[test]
    fn zoom_threshold_has_priority_over_pixel_size() {
        let policy = TextLodPolicy::default();
        assert!(policy.visible(0.21, 0.5, TextPriority::Detail));
        assert!(policy.visible(0.20, 0.5, TextPriority::Detail));
        assert!(!policy.visible(0.199, 0.5, TextPriority::Detail));
    }
}
