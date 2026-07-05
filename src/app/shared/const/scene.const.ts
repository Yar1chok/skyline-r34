import * as THREE from 'three';
import { CameraKeyframe } from '@models/camera-keyframe.type';

export const WHEEL_NAMES = [
  '3DWheel_Front_L',
  '3DWheel_Front_R',
  '3DWheel_Rear_L',
  '3DWheel_Rear_R',
] as const;

export const DASH_COUNT = 28;
export const DASH_SPACING = 9;
export const POLE_COUNT = 16;
export const POLE_SPACING = 12;
// Деревья и трава — главные потребители вершин на слабых GPU:
// меньше клонов, шире шаг (общая протяжённость аллеи сохранена)
export const TREE_COUNT = 5;
export const TREE_SPACING = 20;
export const GRASS_COUNT = 2200;

// Скорости не зависят от FPS: рад/с и коэффициент экспоненциального сглаживания (1/с).
// Эквивалент прежних значений 0.006 и 0.04 на кадр при 60 FPS.
export const AUTO_ROTATE_SPEED = 0.36;
export const CAMERA_SMOOTHING = 2.4;

export const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  { position: new THREE.Vector3(5, 1.5, 0.3), target: new THREE.Vector3(0, 0.4, 0) },
  { position: new THREE.Vector3(3.5, 1.8, 2.5), target: new THREE.Vector3(0, 0.4, 0) },
  { position: new THREE.Vector3(-3.5, 1.8, 2.5), target: new THREE.Vector3(0.5, 0.3, 0.8) },
  { position: new THREE.Vector3(1.6, 0.25, 0.85), target: new THREE.Vector3(0.5, 0.25, 0.85) },
  { position: new THREE.Vector3(1.6, 0.25, 0.85), target: new THREE.Vector3(0.5, 0.25, 0.85) },
  { position: new THREE.Vector3(-0.35, 0.65, -0.25), target: new THREE.Vector3(0, 0.52, 0.65) },
  { position: new THREE.Vector3(-0.35, 0.65, -0.25), target: new THREE.Vector3(0, 0.52, 0.65) },
  { position: new THREE.Vector3(-2.5, 1.5, -3.5), target: new THREE.Vector3(0, 0.5, 0) },
  { position: new THREE.Vector3(0, 1.5, -4.5), target: new THREE.Vector3(0, 0.6, 0) },
];
