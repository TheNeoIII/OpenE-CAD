// SPDX-License-Identifier: MPL-2.0

struct CameraUniform {
    center_mm: vec2<f32>,
    ndc_per_mm: vec2<f32>,
};

@group(0) @binding(0)
var<uniform> camera: CameraUniform;

struct VertexOut {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec3<f32>,
};

@vertex
fn vs_main(
    @location(0) position_mm: vec2<f32>,
    @location(1) color: vec3<f32>,
) -> VertexOut {
    let delta_mm = position_mm - camera.center_mm;

    var out: VertexOut;
    out.position = vec4<f32>(
        delta_mm.x * camera.ndc_per_mm.x,
        delta_mm.y * camera.ndc_per_mm.y,
        0.0,
        1.0,
    );
    out.color = color;
    return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
    return vec4<f32>(in.color, 1.0);
}
