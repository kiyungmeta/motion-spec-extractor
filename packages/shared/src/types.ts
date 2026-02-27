// packages/shared/src/types.ts
//
// Shared type definitions for the motion-spec-extractor project.
// These types define the JSON interchange format between After Effects and Figma.

// ============ Root Document ============

/**
 * The root document structure for a motion specification export.
 * This is the top-level object serialized to JSON when exporting from After Effects
 * and consumed by the Figma plugin for visualization.
 */
export interface MotionSpecDocument {
  /** Semantic version of the motion spec format (e.g. "1.0.0") */
  version: string;
  /** Metadata about when and how the export was performed */
  exportInfo: ExportInfo;
  /** The After Effects composition data including layers and animations */
  composition: Composition;
}

/**
 * Metadata captured at export time describing the source environment.
 */
export interface ExportInfo {
  /** ISO 8601 date string indicating when the export occurred */
  exportedAt: string;
  /** Version of After Effects used for the export (e.g. "24.1") */
  aeVersion: string;
  /** Version of the extractor script that produced this document */
  scriptVersion: string;
  /** File name or path of the original After Effects project */
  sourceFile: string;
}

// ============ Composition ============

/**
 * Represents an After Effects composition with its settings, markers, and layer stack.
 */
export interface Composition {
  /** Display name of the composition */
  name: string;
  /** Width of the composition in pixels */
  width: number;
  /** Height of the composition in pixels */
  height: number;
  /** Frame rate of the composition (frames per second) */
  frameRate: number;
  /** Total duration of the composition in seconds */
  duration: number;
  /** Background color as an RGB tuple with values in the 0-1 range */
  backgroundColor: [number, number, number];
  /** Composition markers (used for labeling sections or sync points) */
  markers: Marker[];
  /** Ordered list of layers in the composition (bottom to top) */
  layers: Layer[];
}

/**
 * A time marker placed on the composition timeline.
 * Markers are commonly used to annotate phases of an animation
 * (e.g. "intro", "loop", "outro").
 */
export interface Marker {
  /** Time position of the marker in seconds */
  time: number;
  /** Duration of the marker region in seconds (0 for point markers) */
  duration: number;
  /** User-defined label or comment for the marker */
  comment: string;
}

// ============ Layers ============

/**
 * Discriminator for the kind of layer in the After Effects composition.
 *
 * - `shape`      - Vector shape layer with path/fill/stroke contents
 * - `text`       - Text layer with character and paragraph styling
 * - `image`      - Footage layer sourced from a still image
 * - `video`      - Footage layer sourced from a video file
 * - `precomp`    - Nested composition (pre-compose) reference
 * - `null`       - Null object used as a parent for grouping transforms
 * - `solid`      - Solid-color layer
 * - `camera`     - 3D camera layer
 * - `light`      - 3D light layer
 * - `adjustment` - Adjustment layer that applies effects to layers below it
 */
export type LayerType =
  | 'shape'
  | 'text'
  | 'image'
  | 'video'
  | 'precomp'
  | 'null'
  | 'solid'
  | 'camera'
  | 'light'
  | 'adjustment';

/**
 * A single layer within an After Effects composition.
 * Contains transform data, animation keyframes, masks, effects,
 * and type-specific payloads (shape paths, text data, etc.).
 */
export interface Layer {
  /** One-based index of the layer in the composition's layer stack */
  index: number;
  /** Display name of the layer */
  name: string;
  /** Discriminator indicating the kind of layer */
  type: LayerType;
  /** Time at which the layer becomes visible, in seconds */
  inPoint: number;
  /** Time at which the layer ceases to be visible, in seconds */
  outPoint: number;
  /** Start time offset of the layer relative to the composition, in seconds */
  startTime: number;
  /** Time stretch factor (1 = normal speed, 0.5 = half speed, etc.) */
  stretch: number;
  /** Whether the layer is enabled (visible) in the composition */
  enabled: boolean;
  /** Whether the layer is soloed */
  solo: boolean;
  /** Whether the layer is marked as shy (hidden from the timeline when shy mode is on) */
  shy: boolean;
  /** Whether the layer is locked from editing */
  locked: boolean;
  /** Blending mode name (e.g. "NORMAL", "MULTIPLY", "SCREEN") */
  blendMode: string;
  /** Whether the layer has 3D properties enabled */
  is3D: boolean;
  /** Index of this layer's parent layer, or null if unparented */
  parentIndex: number | null;
  /** Track matte mode (e.g. "ALPHA", "LUMA"), or null if none */
  trackMatteType: string | null;
  /** Index of the layer used as a track matte source, or null if none */
  trackMatteLayer: number | null;

  /** Core transform properties (position, scale, rotation, opacity, etc.) */
  transform: TransformProperties;
  /** Mask paths applied to this layer */
  masks: MaskData[];
  /** Effects applied to this layer */
  effects: EffectData[];

  /** Shape contents (only present when type is 'shape') */
  shapeData?: ShapeGroupData[];
  /** Text styling and animator data (only present when type is 'text') */
  textData?: TextLayerData;
  /** Solid color and dimensions (only present when type is 'solid') */
  solidData?: SolidData;
  /** Nested composition reference (only present when type is 'precomp') */
  precompData?: PrecompData;
  /** Camera-specific properties (only present when type is 'camera') */
  cameraData?: CameraData;
  /** Light-specific properties (only present when type is 'light') */
  lightData?: LightData;

  /** High-level summary of all animated properties on the layer */
  animationSummary: AnimationSummary;
}

// ============ Transform ============

/**
 * The standard After Effects transform property group.
 * Contains anchor point, position, scale, rotation, and opacity.
 * When 3D is enabled, additional rotation axes are available.
 * Position may optionally be separated into individual X/Y/Z components.
 */
export interface TransformProperties {
  /** The point around which scale and rotation are applied */
  anchorPoint: AnimatedProperty;
  /** Combined position property (used when position dimensions are not separated) */
  position: AnimatedProperty;
  /** Separated position components (present when "Separate Dimensions" is enabled in AE) */
  positionSeparated?: {
    /** X-axis position component */
    x: AnimatedProperty;
    /** Y-axis position component */
    y: AnimatedProperty;
    /** Z-axis position component (only present for 3D layers) */
    z?: AnimatedProperty;
  };
  /** Scale as a percentage (e.g. [100, 100] for 100%) */
  scale: AnimatedProperty;
  /** 2D rotation in degrees (or Z rotation alias for 3D layers) */
  rotation: AnimatedProperty;
  /** X-axis rotation in degrees (only present for 3D layers) */
  rotationX?: AnimatedProperty;
  /** Y-axis rotation in degrees (only present for 3D layers) */
  rotationY?: AnimatedProperty;
  /** Z-axis rotation in degrees (only present for 3D layers) */
  rotationZ?: AnimatedProperty;
  /** Layer opacity as a percentage (0-100) */
  opacity: AnimatedProperty;
}

// ============ Animated Properties ============

/**
 * Represents a single animatable property from After Effects.
 * May be static (a single value) or animated (a sequence of keyframes).
 * Optionally includes an expression string if one is applied.
 */
export interface AnimatedProperty {
  /** Human-readable name of the property (e.g. "Position", "Opacity") */
  name: string;
  /** After Effects internal match name used for scripting (e.g. "ADBE Position") */
  matchName: string;
  /** Whether this property has any keyframes */
  isAnimated: boolean;
  /** Number of value dimensions (1 for scalar, 2 for 2D, 3 for 3D) */
  dimensions: number;
  /** Expression code applied to this property, if any */
  expression?: string;
  /** The property's constant value when not animated */
  staticValue?: PropertyValue;
  /** Ordered list of keyframes when the property is animated */
  keyframes?: Keyframe[];
}

/**
 * The value of a property at a given point in time.
 * - `number` for single-dimension properties (e.g. opacity, rotation)
 * - `number[]` for multi-dimension properties (e.g. position [x, y, z], color [r, g, b])
 * - `string` for text source properties
 */
export type PropertyValue = number | number[] | string;

/**
 * A single keyframe on an animated property.
 * Contains the value at that point in time along with
 * interpolation and easing information.
 */
export interface Keyframe {
  /** One-based index of the keyframe within the property */
  index: number;
  /** Time of the keyframe in seconds */
  time: number;
  /** Frame number corresponding to the keyframe time */
  frame: number;
  /** The property value at this keyframe */
  value: PropertyValue;
  /** Type of interpolation entering and leaving this keyframe */
  interpolationType: InterpolationType;
  /** Temporal easing curves controlling speed through time */
  temporalEasing?: TemporalEasing;
  /** Spatial easing tangents controlling the motion path shape */
  spatialEasing?: SpatialEasing;
}

/**
 * Describes the interpolation method on the incoming and outgoing
 * sides of a keyframe.
 *
 * - `LINEAR` - Constant speed, straight-line interpolation
 * - `BEZIER` - Smooth easing controlled by influence/speed handles
 * - `HOLD`   - No interpolation; value jumps instantly at the keyframe
 */
export interface InterpolationType {
  /** Interpolation type approaching this keyframe */
  inType: 'LINEAR' | 'BEZIER' | 'HOLD';
  /** Interpolation type leaving this keyframe */
  outType: 'LINEAR' | 'BEZIER' | 'HOLD';
}

/**
 * Temporal easing data describing how fast a property changes over time.
 * Speed and influence arrays have one element per value dimension.
 * The `cubicBezier` field provides a normalized CSS-compatible representation.
 */
export interface TemporalEasing {
  /** Incoming speed for each dimension */
  inSpeed: number[];
  /** Incoming influence percentage for each dimension (0-100) */
  inInfluence: number[];
  /** Outgoing speed for each dimension */
  outSpeed: number[];
  /** Outgoing influence percentage for each dimension (0-100) */
  outInfluence: number[];
  /** Normalized cubic bezier derived from the temporal easing handles */
  cubicBezier: CubicBezier;
}

/**
 * A normalized cubic bezier curve compatible with the CSS `cubic-bezier()` function.
 * The start point (0, 0) and end point (1, 1) are implicit.
 */
export interface CubicBezier {
  /** X coordinate of the first control point (0-1 for standard easing) */
  x1: number;
  /** Y coordinate of the first control point */
  y1: number;
  /** X coordinate of the second control point (0-1 for standard easing) */
  x2: number;
  /** Y coordinate of the second control point */
  y2: number;
  /** CSS-formatted string, e.g. "cubic-bezier(0.42, 0, 0.58, 1)" */
  css: string;
}

/**
 * Spatial easing data describing the shape of a motion path
 * between two keyframes. Tangent arrays typically have 2 or 3 elements
 * corresponding to X, Y (and optionally Z) offsets.
 */
export interface SpatialEasing {
  /** Incoming spatial tangent vector */
  inTangent: number[];
  /** Outgoing spatial tangent vector */
  outTangent: number[];
}

// ============ Animation Summary ============

/**
 * A high-level digest of all animation happening on a layer.
 * Useful for quickly determining which layers are animated
 * and providing a simplified overview to the Figma plugin UI.
 */
export interface AnimationSummary {
  /** Whether any property on this layer is animated */
  isAnimated: boolean;
  /** Total number of properties that have keyframes */
  animatedPropertyCount: number;
  /** Sum of all keyframes across all animated properties */
  totalKeyframes: number;
  /** Per-property summaries for each animated property */
  properties: PropertySummary[];
}

/**
 * Summarized animation data for a single property.
 * Captures the start/end values, timing, and primary easing
 * so consumers do not need to parse full keyframe arrays
 * for common use-cases.
 */
export interface PropertySummary {
  /** Human-readable name of the animated property */
  name: string;
  /** Number of keyframes on this property */
  keyframeCount: number;
  /** Value at the first keyframe */
  startValue: PropertyValue;
  /** Value at the last keyframe */
  endValue: PropertyValue;
  /** Duration of the animation in seconds (last keyframe time minus first) */
  duration: number;
  /** Delay from the start of the composition to the first keyframe, in seconds */
  delay: number;
  /** Primary easing curve from the first keyframe pair, or null if not bezier */
  easing: CubicBezier | null;
}

// ============ Shape Data ============

/**
 * Represents a shape content item within a shape layer.
 * Shape layers contain a recursive tree of groups, paths,
 * fills, strokes, and modifiers.
 */
export interface ShapeGroupData {
  /** Display name of the shape content item */
  name: string;
  /** After Effects internal match name for scripting access */
  matchName: string;
  /**
   * The type of shape content:
   * - `group`        - Container for other shape items
   * - `path`         - Bezier path
   * - `fill`         - Solid color or gradient fill
   * - `stroke`       - Outline stroke
   * - `trim`         - Trim Paths modifier
   * - `transform`    - Shape-level transform (distinct from layer transform)
   * - `rectangle`    - Parametric rectangle
   * - `ellipse`      - Parametric ellipse
   * - `polystar`     - Parametric polygon or star
   * - `merge`        - Merge Paths modifier
   * - `repeater`     - Repeater modifier
   * - `roundCorners` - Round Corners modifier
   */
  type:
    | 'group'
    | 'path'
    | 'fill'
    | 'stroke'
    | 'trim'
    | 'transform'
    | 'rectangle'
    | 'ellipse'
    | 'polystar'
    | 'merge'
    | 'repeater'
    | 'roundCorners';
  /** Child shape content items (present when type is 'group') */
  contents?: ShapeGroupData[];
  /** Animatable properties belonging to this shape item */
  properties?: AnimatedProperty[];
}

// ============ Text Data ============

/**
 * Data specific to text layers, including the source text,
 * font styling, and any text animators applied.
 */
export interface TextLayerData {
  /** The text content as an animated property (value changes over time) */
  sourceText: AnimatedProperty;
  /** Font family name (e.g. "Helvetica Neue") */
  font: string;
  /** Font size in pixels */
  fontSize: number;
  /** Fill color of the text as an RGB tuple with values in the 0-1 range */
  fillColor: [number, number, number];
  /** Stroke color of the text as an RGB tuple (0-1), if stroke is enabled */
  strokeColor?: [number, number, number];
  /** Stroke width in pixels, if stroke is enabled */
  strokeWidth?: number;
  /** Character tracking (letter-spacing) value */
  tracking: number;
  /** Line leading (line-height) value */
  leading: number;
  /** Paragraph justification (e.g. "LEFT", "CENTER", "RIGHT", "FULL") */
  justification: string;
  /** Text animators applied to this text layer */
  animators: TextAnimatorData[];
}

/**
 * A text animator, which applies animated properties to a range of
 * characters selected by the animator's selector.
 */
export interface TextAnimatorData {
  /** Display name of the animator */
  name: string;
  /** Animated properties controlled by this animator (e.g. position, opacity) */
  properties: AnimatedProperty[];
  /** Range selector defining which characters are affected */
  selector: {
    /** Start of the selection range as an animated property */
    start: AnimatedProperty;
    /** End of the selection range as an animated property */
    end: AnimatedProperty;
    /** Offset of the selection range as an animated property */
    offset: AnimatedProperty;
    /** Selector type (e.g. "RANGE", "EXPRESSION") */
    type: string;
  };
}

// ============ Other Layer Data ============

/**
 * Data specific to solid-color layers.
 */
export interface SolidData {
  /** Solid color as an RGB tuple with values in the 0-1 range */
  color: [number, number, number];
  /** Width of the solid in pixels */
  width: number;
  /** Height of the solid in pixels */
  height: number;
}

/**
 * Data specific to pre-composition (nested composition) layers.
 */
export interface PrecompData {
  /** Name of the referenced nested composition */
  compositionName: string;
  /** The full nested composition data (recursively included, capped at depth 5) */
  composition?: Composition;
  /** Time remapping property, if enabled on this precomp layer */
  timeRemap?: AnimatedProperty;
}

/**
 * Data specific to 3D camera layers.
 */
export interface CameraData {
  /** Camera zoom value (focal length proxy) as an animated property */
  zoom: AnimatedProperty;
  /** Whether depth of field is enabled on this camera */
  depthOfField: boolean;
  /** Focus distance as an animated property (present when DOF is enabled) */
  focusDistance?: AnimatedProperty;
  /** Aperture size as an animated property (present when DOF is enabled) */
  aperture?: AnimatedProperty;
  /** Blur level as an animated property (present when DOF is enabled) */
  blurLevel?: AnimatedProperty;
}

/**
 * Data specific to 3D light layers.
 */
export interface LightData {
  /** Type of light (e.g. "POINT", "SPOT", "PARALLEL", "AMBIENT") */
  lightType: string;
  /** Light intensity as an animated property (percentage) */
  intensity: AnimatedProperty;
  /** Light color as an animated property (RGB 0-1) */
  color: AnimatedProperty;
  /** Cone angle for spot lights, as an animated property */
  coneAngle?: AnimatedProperty;
  /** Cone feather for spot lights, as an animated property */
  coneFeather?: AnimatedProperty;
  /** Shadow darkness as an animated property (0-100) */
  shadowDarkness?: AnimatedProperty;
  /** Shadow diffusion as an animated property */
  shadowDiffusion?: AnimatedProperty;
}

// ============ Masks ============

/**
 * A mask applied to a layer, defining a region that controls
 * the layer's transparency via its path shape.
 */
export interface MaskData {
  /** Display name of the mask */
  name: string;
  /** Mask mode (e.g. "ADD", "SUBTRACT", "INTERSECT", "LIGHTEN", "DARKEN", "DIFFERENCE") */
  mode: string;
  /** Whether the mask is inverted */
  inverted: boolean;
  /** The mask path shape as an animated property */
  path: AnimatedProperty;
  /** Mask feather (blur) amount as an animated property */
  feather: AnimatedProperty;
  /** Mask opacity as an animated property (0-100) */
  opacity: AnimatedProperty;
  /** Mask expansion as an animated property (pixels) */
  expansion: AnimatedProperty;
}

// ============ Effects ============

/**
 * An effect applied to a layer (e.g. Gaussian Blur, Drop Shadow).
 * Contains the effect's own animatable properties.
 */
export interface EffectData {
  /** Display name of the effect */
  name: string;
  /** After Effects internal match name for scripting access */
  matchName: string;
  /** Whether the effect is currently enabled */
  enabled: boolean;
  /** The effect's animatable properties */
  properties: AnimatedProperty[];
}
