// packages/shared/src/index.ts
//
// Barrel export for the shared types package.
// Re-exports all type definitions from the types module.

export type {
  // Root Document
  MotionSpecDocument,
  ExportInfo,

  // Composition
  Composition,
  Marker,

  // Layers
  LayerType,
  Layer,

  // Transform
  TransformProperties,

  // Animated Properties
  AnimatedProperty,
  PropertyValue,
  Keyframe,
  InterpolationType,
  TemporalEasing,
  CubicBezier,
  SpatialEasing,

  // Animation Summary
  AnimationSummary,
  PropertySummary,

  // Shape Data
  ShapeGroupData,

  // Text Data
  TextLayerData,
  TextAnimatorData,

  // Other Layer Data
  SolidData,
  PrecompData,
  CameraData,
  LightData,

  // Masks
  MaskData,

  // Effects
  EffectData,
} from './types';
