// FLOW scenes: palette + material. Each breath cycle uses the next stratum color.
import { hexToRgb } from './sprites.js';

const rgb = (list) => list.map(hexToRgb);

export const SCENES = [
  {
    id: 'dusk-dunes',
    material: 'sand',
    sky: ['#0b0a1a', '#1a1238'],
    strata: rgb(['#e8c9a0', '#dcb48f', '#c99a86', '#b98a9a', '#a985b4', '#c6a2b6', '#e0bc9c', '#f0d6b0']),
    water: hexToRgb('#6fb7ff'),
    waterHi: hexToRgb('#cfe6ff'),
    groove: hexToRgb('#fff0d6'),
    grain: '#e8c9a0',
    starColor: 0
  },
  {
    id: 'moon-pool',
    material: 'water',
    sky: ['#090a1c', '#121633'],
    strata: rgb(['#9aa6c8', '#8d98bf', '#a3a9cc', '#b3b6d6', '#9fa9cf', '#8b94bd', '#a6b0d4', '#c0c4e0']),
    water: hexToRgb('#6f8fd8'),
    waterHi: hexToRgb('#e4ebff'),
    groove: hexToRgb('#f0f4ff'),
    grain: '#cfdcff',
    moon: true,
    starColor: 0
  },
  {
    id: 'aurora-lake',
    material: 'mix',
    sky: ['#070b1a', '#0f1a2e'],
    strata: rgb(['#d9c6a6', '#bfb39c', '#a8a6a0', '#9aa8b0', '#b0a3c4', '#c9b3c0', '#e2c9a8', '#cfc0a8']),
    water: hexToRgb('#5fa8c8'),
    waterHi: hexToRgb('#c8fff0'),
    groove: hexToRgb('#e8fff4'),
    grain: '#b8ffe0',
    aurora: true,
    starColor: 6
  },
  {
    id: 'ember-garden',
    material: 'sand',
    sky: ['#0d0914', '#22121e'],
    strata: rgb(['#f0b070', '#e09a62', '#c97b5a', '#b06a60', '#d98e5e', '#f2be84', '#cf8768', '#e7a874']),
    water: hexToRgb('#8f7cff'),
    waterHi: hexToRgb('#ffd9b0'),
    groove: hexToRgb('#ffe2b8'),
    grain: '#ffb070',
    embers: true,
    starColor: 4
  }
];

// Sand palette for SAND mode (soft dunes on indigo).
export const SAND_PALETTE = {
  strata: rgb(['#e8c9a0', '#e2bd96', '#d6aa8c', '#c79b92', '#b994a8', '#c9a6b0', '#dcbb9e', '#ecd2ae']),
  water: hexToRgb('#6fb7ff'),
  waterHi: hexToRgb('#cfe6ff'),
  groove: hexToRgb('#efe4ff')
};
