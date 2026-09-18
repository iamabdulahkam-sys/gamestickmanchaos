/**
 * Stickman Flag Chaos - Configuration Module
 * Holds all game constants, physics tuning, themes, obstacles, weather, 100 countries, and new chaos settings.
 */

export const CONFIG = {
  CANVAS: {
    WIDTH: 1280,
    HEIGHT: 720,
    ASPECT_RATIO: 16 / 9,
  },
  RESOLUTIONS: {
    auto: { id: 'auto', name: 'Auto (HiDPI / Native Display)', scale: null },
    '720p': { id: '720p', name: 'Standard HD (720p - 1280×720)', scale: 1.0, width: 1280, height: 720 },
    '1080p': { id: '1080p', name: 'Full HD (1080p - 1920×1080)', scale: 1.5, width: 1920, height: 1080 },
    '1440p': { id: '1440p', name: '2K QHD (1440p - 2560×1440)', scale: 2.0, width: 2560, height: 1440 },
    '4k': { id: '4k', name: 'Ultra HD 4K (2160p - 3840×2160)', scale: 3.0, width: 3840, height: 2160 },
  },
  TOURNAMENT: {
    INTRO_DURATION_SECONDS: 10,
    STAGE_CLEARED_SECONDS: 6,
  },
  ARENA: {
    DEFAULT_RADIUS: 290,
    WALL_THICKNESS: 32,
    RESTITUTION: 0.65,
    FRICTION: 0.08,
  },
  ARENA_SHAPES: {
    octagon: {
      id: 'octagon',
      name: 'Octagon Ring (8-Sided)',
      description: 'The classic 8-sided battle ring with corner rebounds.',
    },
    rectangle_full: {
      id: 'rectangle_full',
      name: 'Full Screen Rectangle',
      description: 'Maximum play area covering the entire screen boundaries.',
    },
    rectangle: {
      id: 'rectangle',
      name: 'Boxing / Wrestling Ring',
      description: 'A compact center rectangular arena for intense clashing.',
    },
    star: {
      id: 'star',
      name: 'Comic Star Ring',
      description: 'A 5-pointed chaotic star with sharp corner bounce traps!',
    },
    circle: {
      id: 'circle',
      name: 'Circular Dome Ring',
      description: 'A smooth circular perimeter with endless continuous bounciness.',
    },
  },
  THEMES: {
    neon: {
      id: 'neon',
      name: 'Cyber Neon',
      bgRadial: ['#1E2235', '#0C0E17'],
      gridColor: 'rgba(255, 255, 255, 0.03)',
      wallColor: '#2E344E',
      wallBorder: '#00F0FF',
      floorAccent: '#22273D',
      floorColor: '#181B2A',
      ringColor: 'rgba(0, 240, 255, 0.14)',
      obstacleColor: '#00F0FF',
    },
    comic: {
      id: 'comic',
      name: 'Retro Comic',
      bgRadial: ['#2E2235', '#140D1C'],
      gridColor: 'rgba(255, 230, 0, 0.04)',
      wallColor: '#422D4F',
      wallBorder: '#FFE600',
      floorAccent: '#3B244A',
      floorColor: '#261433',
      ringColor: 'rgba(255, 230, 0, 0.18)',
      obstacleColor: '#FFE600',
    },
    cosmic: {
      id: 'cosmic',
      name: 'Cosmic Galaxy',
      bgRadial: ['#24153B', '#090514'],
      gridColor: 'rgba(255, 46, 147, 0.04)',
      wallColor: '#3B2056',
      wallBorder: '#FF2E93',
      floorAccent: '#2C1645',
      floorColor: '#180B2B',
      ringColor: 'rgba(255, 46, 147, 0.16)',
      obstacleColor: '#FF2E93',
    },
    volcano: {
      id: 'volcano',
      name: 'Volcano Pit',
      bgRadial: ['#3A1616', '#140505'],
      gridColor: 'rgba(255, 90, 0, 0.04)',
      wallColor: '#4A1D1D',
      wallBorder: '#FF5500',
      floorAccent: '#3D1515',
      floorColor: '#230B0B',
      ringColor: 'rgba(255, 85, 0, 0.22)',
      obstacleColor: '#FF5500',
    },
    dojo: {
      id: 'dojo',
      name: 'Royal Dojo',
      bgRadial: ['#2A2720', '#12100B'],
      gridColor: 'rgba(255, 215, 0, 0.035)',
      wallColor: '#423A2C',
      wallBorder: '#FFD700',
      floorAccent: '#383022',
      floorColor: '#201A11',
      ringColor: 'rgba(255, 215, 0, 0.18)',
      obstacleColor: '#FFD700',
    },
  },
  OBSTACLES: {
    none: {
      id: 'none',
      name: 'None (Clear Arena)',
      description: 'Open battle ring without obstacles.',
    },
    bumper: {
      id: 'bumper',
      name: 'Bouncy Bumper',
      description: 'A super bouncy cartoon center spring!',
    },
    pillars: {
      id: 'pillars',
      name: 'Twin Pillars',
      description: 'Two solid defense pillars in the arena.',
    },
    platform: {
      id: 'platform',
      name: 'Floating Platform',
      description: 'High ground stage in the center of the ring.',
    },
    spinner: {
      id: 'spinner',
      name: 'Spinning Bar',
      description: 'A rotating beam that knocks fighters back!',
    },
  },
  GRAVITY_MODES: {
    normal: { id: 'normal', name: 'Normal', y: 1.15, buoyancy: 0, desc: 'Standard gravity' },
    float: { id: 'float', name: 'Floating Low-G', y: 0.38, buoyancy: 0.0022, desc: 'High air float & whole ring usage' },
    zerog: { id: 'zerog', name: 'Zero-G Space', y: 0.04, buoyancy: 0.0025, desc: 'Full 360 degree floating battle' },
    wave: { id: 'wave', name: 'Chaotic Wave', y: 0.65, buoyancy: 0.004, desc: 'Oscillating floating gravity waves' },
  },
  WEATHER: {
    none: { id: 'none', name: 'Clear Sky' },
    rain: { id: 'rain', name: 'Rainstorm (Water Ripples)' },
    wind: { id: 'wind', name: 'Wind Gusts (Push & Lift Force)' },
    lightning: { id: 'lightning', name: 'Thunderstorm (Lightning Strikes)' },
    chaos: { id: 'chaos', name: 'Dynamic Chaos (Random Weather)' },
  },
  BOUNCE_SPEEDS: {
    '0.15': { id: '0.15', name: 'Ultra Gentle (0.15x)', mult: 0.15 },
    '0.35': { id: '0.35', name: 'Super Slow (0.35x)', mult: 0.35 },
    '0.65': { id: '0.65', name: 'Soft (0.65x)', mult: 0.65 },
    '1.0': { id: '1.0', name: 'Normal (1.0x)', mult: 1.0 },
    '1.5': { id: '1.5', name: 'Bouncy (1.5x)', mult: 1.5 },
    '2.5': { id: '2.5', name: 'Crazy (2.5x)', mult: 2.5 },
  },
  MOVEMENT_SPEEDS: {
    '0.35': { id: '0.35', name: 'Slow Motion (0.35x)', mult: 0.35 },
    '0.65': { id: '0.65', name: 'Relaxed (0.65x)', mult: 0.65 },
    '1.0': { id: '1.0', name: 'Normal (1.0x)', mult: 1.0 },
    '1.35': { id: '1.35', name: 'Turbo Fast (1.35x)', mult: 1.35 },
  },
  HP_PRESETS: {
    '100': { id: '100', name: 'Quick (100 HP)', hp: 100 },
    '250': { id: '250', name: 'Balanced (250 HP)', hp: 250 },
    '400': { id: '400', name: 'Epic Brawl (400 HP)', hp: 400 },
    '700': { id: '700', name: 'Marathon (700 HP)', hp: 700 },
  },
  LIGHTNING_CONFIG: {
    strikeCounts: {
      '1': { id: '1', name: 'Single Bolt (1x)', count: 1 },
      '2': { id: '2', name: 'Double Strike (2x)', count: 2 },
      '4': { id: '4', name: 'Thunder Barrage (4x)', count: 4 },
    },
    intervals: {
      rare: { id: 'rare', name: 'Rare (12-20s)', min: 12.0, max: 20.0 },
      normal: { id: 'normal', name: 'Normal (6-10s)', min: 6.0, max: 10.0 },
      intense: { id: 'intense', name: 'Intense (2.5-5s)', min: 2.5, max: 5.0 },
    },
  },
  WIND_CONFIG: {
    strengths: {
      breeze: { id: 'breeze', name: 'Gentle Breeze', forceMult: 0.5, liftMult: 0.4 },
      strong: { id: 'strong', name: 'Strong Gusts (Lifting)', forceMult: 1.0, liftMult: 1.0 },
      typhoon: { id: 'typhoon', name: 'Typhoon Chaos (Flying)', forceMult: 2.2, liftMult: 2.0 },
    },
    GUST_DURATION_MIN: 3.5,
    GUST_DURATION_MAX: 6.5,
    CALM_DURATION_MIN: 2.0,
    CALM_DURATION_MAX: 4.0,
  },
  BOMB_CONFIG: {
    intervals: {
      frequent: { id: 'frequent', name: 'Frequent (8-14s)', min: 8.0, max: 14.0 },
      normal: { id: 'normal', name: 'Normal (15-25s)', min: 15.0, max: 25.0 },
      rare: { id: 'rare', name: 'Rare (30-45s)', min: 30.0, max: 45.0 },
    },
    fuseTimes: {
      '3': { id: '3', name: '3 Seconds (Panic)', time: 3.0 },
      '5': { id: '5', name: '5 Seconds (Standard)', time: 5.0 },
      '8': { id: '8', name: '8 Seconds (Long Fuse)', time: 8.0 },
    },
  },
  FIGHTER_COUNT_PRESETS: [2, 4, 8, 16, 32, 50, 100],
  PHYSICS: {
    GRAVITY: { x: 0, y: 1.15 },
    AIR_RESISTANCE: 0.015,
    STICKMAN_COLLISION_CATEGORY: 0x0002,
    WALL_COLLISION_CATEGORY: 0x0001,
    OBSTACLE_COLLISION_CATEGORY: 0x0004,
  },
  FIGHTER: {
    BASE_HP: 250, // Increased from 100 for longer, more exciting matches
    HEAD_RADIUS: 17,
    TORSO_LENGTH: 32,
    ARM_LENGTH: 20,
    LEG_LENGTH: 24,
    MOVE_FORCE: 0.0042,
    SPRINT_FORCE: 0.0072,
    JUMP_FORCE: 0.054,
    MAX_SPEED: 5.5,
    PUNCH_RANGE: 50,
    PUNCH_DAMAGE_MIN: 4, // Tuned for balanced longevity
    PUNCH_DAMAGE_MAX: 8,
    PUNCH_KNOCKBACK: 7.0,
    PUNCH_COOLDOWN_MS: 500,
    DODGE_CHANCE: 0.22,
  },
  ITEMS: {
    SPAWN_INTERVAL_MIN: 4.5,
    SPAWN_INTERVAL_MAX: 8.5,
    MAX_ITEMS: 3,
    PICKUP_RADIUS: 32,
    TYPES: {
      glove: {
        id: 'glove',
        name: 'Giant Boxing Glove',
        bonusDamage: 10,
        maxHits: 6,
        color: '#FF1E56',
        comicWord: 'SUPER PUNCH!',
        knockbackMult: 1.5,
      },
      hammer: {
        id: 'hammer',
        name: 'Squeaky Toy Mallet',
        bonusDamage: 14,
        maxHits: 5,
        color: '#FFE600',
        comicWord: 'HAMMER TIME!',
        knockbackMult: 1.7,
      },
      chili: {
        id: 'chili',
        name: 'Spicy Fire Chili',
        bonusDamage: 8,
        speedBoost: 1.35,
        maxHits: 7,
        color: '#FF5500',
        comicWord: 'SPICY HOT!',
        knockbackMult: 1.3,
      },
      star: {
        id: 'star',
        name: 'Magic Zap Wand',
        bonusDamage: 12,
        maxHits: 6,
        color: '#00F0FF',
        comicWord: 'ZAP POWER!',
        knockbackMult: 1.55,
      },
    },
  },
  EFFECTS: {
    MAX_PARTICLES: 350,
    SCREEN_SHAKE_DECAY: 0.88,
    COMIC_WORDS: ['POW!', 'BONK!', 'WHAM!', 'BOOM!', 'BAM!', 'OOF!', 'KAPOW!', 'SOCK!', 'BOING!', 'CLANG!', 'ZAP!', 'KABOOM!'],
    MAX_ACTIVE_POPUPS: 7,
    POPUP_DURATION_MIN: 0.35,
    POPUP_DURATION_MAX: 0.65,
    WORD_PROB_MIN: 0.20,
    WORD_PROB_MAX: 1.0,
    FONT_SIZE_MIN: 11,
    FONT_SIZE_MAX: 24,
    OUTLINE_WIDTH_MIN: 2.5,
    OUTLINE_WIDTH_MAX: 6.5,
  },
  AI: {
    MAX_ATTACKERS_PER_TARGET: 2,
    CROWD_SEPARATION_RADIUS: 35,
    CROWD_SEPARATION_MIN_COUNT: 3,
  },
  COUNTRIES: [
  {
    "id": "indonesia",
    "name": "Indonesia",
    "code": "ID",
    "primaryColor": "#E70011",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#E70011",
    "flag": {
      "type": "horizontal_2",
      "colors": [
        "#E70011",
        "#FFFFFF"
      ]
    },
    "description": "Garuda Spirit"
  },
  {
    "id": "japan",
    "name": "Japan",
    "code": "JP",
    "primaryColor": "#BC002D",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#BC002D",
    "flag": {
      "type": "circle_center",
      "colors": [
        "#FFFFFF",
        "#BC002D"
      ]
    },
    "description": "Rising Sun"
  },
  {
    "id": "south_korea",
    "name": "South Korea",
    "code": "KR",
    "primaryColor": "#0047A0",
    "secondaryColor": "#CD2E3A",
    "bodyColor": "#005AC2",
    "flag": {
      "type": "taegeuk",
      "colors": [
        "#FFFFFF",
        "#CD2E3A",
        "#0047A0"
      ]
    },
    "description": "Taegeuk Power"
  },
  {
    "id": "china",
    "name": "China",
    "code": "CN",
    "primaryColor": "#DE2910",
    "secondaryColor": "#FFDE00",
    "bodyColor": "#DE2910",
    "flag": {
      "type": "star_canton",
      "colors": [
        "#DE2910",
        "#FFDE00"
      ]
    },
    "description": "Dragon Punch"
  },
  {
    "id": "malaysia",
    "name": "Malaysia",
    "code": "MY",
    "primaryColor": "#010066",
    "secondaryColor": "#CC0000",
    "bodyColor": "#CC0000",
    "flag": {
      "type": "canton_crescent",
      "colors": [
        "#CC0000",
        "#FFFFFF",
        "#010066",
        "#FFCC00"
      ]
    },
    "description": "Harimau Roar"
  },
  {
    "id": "singapore",
    "name": "Singapore",
    "code": "SG",
    "primaryColor": "#ED2939",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#ED2939",
    "flag": {
      "type": "horizontal_2_crescent",
      "colors": [
        "#ED2939",
        "#FFFFFF"
      ]
    },
    "description": "Lion City"
  },
  {
    "id": "thailand",
    "name": "Thailand",
    "code": "TH",
    "primaryColor": "#241D4F",
    "secondaryColor": "#A51931",
    "bodyColor": "#241D4F",
    "flag": {
      "type": "horizontal_5",
      "colors": [
        "#A51931",
        "#FFFFFF",
        "#241D4F"
      ]
    },
    "description": "Muay Thai"
  },
  {
    "id": "philippines",
    "name": "Philippines",
    "code": "PH",
    "primaryColor": "#0038A8",
    "secondaryColor": "#CE1126",
    "bodyColor": "#0038A8",
    "flag": {
      "type": "triangle_left",
      "colors": [
        "#0038A8",
        "#CE1126",
        "#FFFFFF",
        "#FCD116"
      ]
    },
    "description": "Luzon Flare"
  },
  {
    "id": "vietnam",
    "name": "Vietnam",
    "code": "VN",
    "primaryColor": "#DA251D",
    "secondaryColor": "#FFFF00",
    "bodyColor": "#DA251D",
    "flag": {
      "type": "star_center",
      "colors": [
        "#DA251D",
        "#FFFF00"
      ]
    },
    "description": "Golden Star"
  },
  {
    "id": "india",
    "name": "India",
    "code": "IN",
    "primaryColor": "#FF9933",
    "secondaryColor": "#138808",
    "bodyColor": "#FF8800",
    "flag": {
      "type": "horizontal_3_chakra",
      "colors": [
        "#FF9933",
        "#FFFFFF",
        "#138808",
        "#000080"
      ]
    },
    "description": "Chakra Whirl"
  },
  {
    "id": "pakistan",
    "name": "Pakistan",
    "code": "PK",
    "primaryColor": "#01411C",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#01411C",
    "flag": {
      "type": "vertical_crescent",
      "colors": [
        "#FFFFFF",
        "#01411C"
      ]
    },
    "description": "Green Crescent"
  },
  {
    "id": "bangladesh",
    "name": "Bangladesh",
    "code": "BD",
    "primaryColor": "#006A4E",
    "secondaryColor": "#F42A41",
    "bodyColor": "#006A4E",
    "flag": {
      "type": "circle_offset",
      "colors": [
        "#006A4E",
        "#F42A41"
      ]
    },
    "description": "Bengal Roar"
  },
  {
    "id": "sri_lanka",
    "name": "Sri Lanka",
    "code": "LK",
    "primaryColor": "#8D153A",
    "secondaryColor": "#FFBE29",
    "bodyColor": "#8D153A",
    "flag": {
      "type": "horizontal_bordered",
      "colors": [
        "#8D153A",
        "#FFBE29",
        "#00534E",
        "#EB7400"
      ]
    },
    "description": "Lion Claw"
  },
  {
    "id": "nepal",
    "name": "Nepal",
    "code": "NP",
    "primaryColor": "#DC143C",
    "secondaryColor": "#003893",
    "bodyColor": "#DC143C",
    "flag": {
      "type": "nepal_shape",
      "colors": [
        "#DC143C",
        "#003893",
        "#FFFFFF"
      ]
    },
    "description": "Himalayan Force"
  },
  {
    "id": "kazakhstan",
    "name": "Kazakhstan",
    "code": "KZ",
    "primaryColor": "#00AFCA",
    "secondaryColor": "#FEC50C",
    "bodyColor": "#00AFCA",
    "flag": {
      "type": "sun_eagle",
      "colors": [
        "#00AFCA",
        "#FEC50C"
      ]
    },
    "description": "Steppe Eagle"
  },
  {
    "id": "uzbekistan",
    "name": "Uzbekistan",
    "code": "UZ",
    "primaryColor": "#1EB53A",
    "secondaryColor": "#0099B5",
    "bodyColor": "#0099B5",
    "flag": {
      "type": "horizontal_3_stars",
      "colors": [
        "#0099B5",
        "#FFFFFF",
        "#1EB53A",
        "#CE1126"
      ]
    },
    "description": "Silk Road"
  },
  {
    "id": "usa",
    "name": "United States",
    "code": "US",
    "primaryColor": "#3C3B6E",
    "secondaryColor": "#B22234",
    "bodyColor": "#2B579A",
    "flag": {
      "type": "usa_stripes",
      "colors": [
        "#B22234",
        "#FFFFFF",
        "#3C3B6E"
      ]
    },
    "description": "Star Spangled"
  },
  {
    "id": "canada",
    "name": "Canada",
    "code": "CA",
    "primaryColor": "#FF0000",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#FF0000",
    "flag": {
      "type": "canada_leaf",
      "colors": [
        "#FF0000",
        "#FFFFFF"
      ]
    },
    "description": "Maple Smash"
  },
  {
    "id": "mexico",
    "name": "Mexico",
    "code": "MX",
    "primaryColor": "#006847",
    "secondaryColor": "#CE1126",
    "bodyColor": "#006847",
    "flag": {
      "type": "vertical_3_emblem",
      "colors": [
        "#006847",
        "#FFFFFF",
        "#CE1126",
        "#8B5A2B"
      ]
    },
    "description": "Aztec Warrior"
  },
  {
    "id": "brazil",
    "name": "Brazil",
    "code": "BR",
    "primaryColor": "#009739",
    "secondaryColor": "#FEDD00",
    "bodyColor": "#009739",
    "flag": {
      "type": "brazil_rhombus",
      "colors": [
        "#009739",
        "#FEDD00",
        "#012169"
      ]
    },
    "description": "Samba Kick"
  },
  {
    "id": "argentina",
    "name": "Argentina",
    "code": "AR",
    "primaryColor": "#74ACDF",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#74ACDF",
    "flag": {
      "type": "horizontal_3_sun",
      "colors": [
        "#74ACDF",
        "#FFFFFF",
        "#F6B40E"
      ]
    },
    "description": "Sun of May"
  },
  {
    "id": "colombia",
    "name": "Colombia",
    "code": "CO",
    "primaryColor": "#FCD116",
    "secondaryColor": "#003893",
    "bodyColor": "#FCD116",
    "flag": {
      "type": "colombia_bars",
      "colors": [
        "#FCD116",
        "#003893",
        "#CE1126"
      ]
    },
    "description": "Cafetero Strike"
  },
  {
    "id": "chile",
    "name": "Chile",
    "code": "CL",
    "primaryColor": "#0039A6",
    "secondaryColor": "#D52B1E",
    "bodyColor": "#0039A6",
    "flag": {
      "type": "chile_star",
      "colors": [
        "#FFFFFF",
        "#D52B1E",
        "#0039A6"
      ]
    },
    "description": "Andes Power"
  },
  {
    "id": "peru",
    "name": "Peru",
    "code": "PE",
    "primaryColor": "#D91023",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#D91023",
    "flag": {
      "type": "vertical_3",
      "colors": [
        "#D91023",
        "#FFFFFF",
        "#D91023"
      ]
    },
    "description": "Inca Champion"
  },
  {
    "id": "uruguay",
    "name": "Uruguay",
    "code": "UY",
    "primaryColor": "#0038A8",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#0038A8",
    "flag": {
      "type": "uruguay_sun",
      "colors": [
        "#FFFFFF",
        "#0038A8",
        "#FCD116"
      ]
    },
    "description": "Charrua"
  },
  {
    "id": "jamaica",
    "name": "Jamaica",
    "code": "JM",
    "primaryColor": "#007749",
    "secondaryColor": "#FFB81C",
    "bodyColor": "#007749",
    "flag": {
      "type": "saltire_cross",
      "colors": [
        "#000000",
        "#007749",
        "#FFB81C"
      ]
    },
    "description": "Reggae Lightning"
  },
  {
    "id": "cuba",
    "name": "Cuba",
    "code": "CU",
    "primaryColor": "#002590",
    "secondaryColor": "#CB1515",
    "bodyColor": "#002590",
    "flag": {
      "type": "triangle_left_star",
      "colors": [
        "#002590",
        "#FFFFFF",
        "#CB1515"
      ]
    },
    "description": "Carib Flare"
  },
  {
    "id": "costa_rica",
    "name": "Costa Rica",
    "code": "CR",
    "primaryColor": "#001489",
    "secondaryColor": "#DA291C",
    "bodyColor": "#001489",
    "flag": {
      "type": "horizontal_5_costa",
      "colors": [
        "#001489",
        "#FFFFFF",
        "#DA291C"
      ]
    },
    "description": "Pura Vida"
  },
  {
    "id": "panama",
    "name": "Panama",
    "code": "PA",
    "primaryColor": "#005293",
    "secondaryColor": "#D21034",
    "bodyColor": "#005293",
    "flag": {
      "type": "quarters_stars",
      "colors": [
        "#FFFFFF",
        "#005293",
        "#D21034"
      ]
    },
    "description": "Canal Master"
  },
  {
    "id": "ecuador",
    "name": "Ecuador",
    "code": "EC",
    "primaryColor": "#FFD100",
    "secondaryColor": "#0047AB",
    "bodyColor": "#FFD100",
    "flag": {
      "type": "colombia_bars",
      "colors": [
        "#FFD100",
        "#0047AB",
        "#EF3340"
      ]
    },
    "description": "Equator Rush"
  },
  {
    "id": "venezuela",
    "name": "Venezuela",
    "code": "VE",
    "primaryColor": "#FFCC00",
    "secondaryColor": "#00247D",
    "bodyColor": "#00247D",
    "flag": {
      "type": "horizontal_3_arcstars",
      "colors": [
        "#FFCC00",
        "#00247D",
        "#CF142B"
      ]
    },
    "description": "Vinotinto"
  },
  {
    "id": "bolivia",
    "name": "Bolivia",
    "code": "BO",
    "primaryColor": "#D52B1E",
    "secondaryColor": "#007934",
    "bodyColor": "#007934",
    "flag": {
      "type": "horizontal_3",
      "colors": [
        "#D52B1E",
        "#F9E300",
        "#007934"
      ]
    },
    "description": "Highland Peak"
  },
  {
    "id": "paraguay",
    "name": "Paraguay",
    "code": "PY",
    "primaryColor": "#D52B1E",
    "secondaryColor": "#0038A8",
    "bodyColor": "#0038A8",
    "flag": {
      "type": "horizontal_3_circle",
      "colors": [
        "#D52B1E",
        "#FFFFFF",
        "#0038A8"
      ]
    },
    "description": "Guarani"
  },
  {
    "id": "uk",
    "name": "United Kingdom",
    "code": "GB",
    "primaryColor": "#012169",
    "secondaryColor": "#C8102E",
    "bodyColor": "#1A3888",
    "flag": {
      "type": "union_jack",
      "colors": [
        "#012169",
        "#FFFFFF",
        "#C8102E"
      ]
    },
    "description": "Royal Punch"
  },
  {
    "id": "germany",
    "name": "Germany",
    "code": "DE",
    "primaryColor": "#DD0000",
    "secondaryColor": "#FFCE00",
    "bodyColor": "#DD0000",
    "flag": {
      "type": "horizontal_3",
      "colors": [
        "#000000",
        "#DD0000",
        "#FFCE00"
      ]
    },
    "description": "Blitz Striker"
  },
  {
    "id": "france",
    "name": "France",
    "code": "FR",
    "primaryColor": "#002654",
    "secondaryColor": "#ED2939",
    "bodyColor": "#104BA9",
    "flag": {
      "type": "vertical_3",
      "colors": [
        "#002654",
        "#FFFFFF",
        "#ED2939"
      ]
    },
    "description": "Tricolor Spark"
  },
  {
    "id": "italy",
    "name": "Italy",
    "code": "IT",
    "primaryColor": "#009246",
    "secondaryColor": "#CE2B37",
    "bodyColor": "#009246",
    "flag": {
      "type": "vertical_3",
      "colors": [
        "#009246",
        "#FFFFFF",
        "#CE2B37"
      ]
    },
    "description": "Azzurri Flame"
  },
  {
    "id": "spain",
    "name": "Spain",
    "code": "ES",
    "primaryColor": "#AA151B",
    "secondaryColor": "#F1BF00",
    "bodyColor": "#AA151B",
    "flag": {
      "type": "spain_bars",
      "colors": [
        "#AA151B",
        "#F1BF00"
      ]
    },
    "description": "Matador Fury"
  },
  {
    "id": "netherlands",
    "name": "Netherlands",
    "code": "NL",
    "primaryColor": "#AE1C28",
    "secondaryColor": "#21468B",
    "bodyColor": "#FF6600",
    "flag": {
      "type": "horizontal_3",
      "colors": [
        "#AE1C28",
        "#FFFFFF",
        "#21468B"
      ]
    },
    "description": "Oranje Cyclone"
  },
  {
    "id": "portugal",
    "name": "Portugal",
    "code": "PT",
    "primaryColor": "#046A38",
    "secondaryColor": "#DA291C",
    "bodyColor": "#DA291C",
    "flag": {
      "type": "portugal_split",
      "colors": [
        "#046A38",
        "#DA291C",
        "#FFDE00"
      ]
    },
    "description": "Navigator Blast"
  },
  {
    "id": "sweden",
    "name": "Sweden",
    "code": "SE",
    "primaryColor": "#006AA7",
    "secondaryColor": "#FECC00",
    "bodyColor": "#006AA7",
    "flag": {
      "type": "cross_nordic",
      "colors": [
        "#006AA7",
        "#FECC00"
      ]
    },
    "description": "Viking Hammer"
  },
  {
    "id": "norway",
    "name": "Norway",
    "code": "NO",
    "primaryColor": "#BA0C2F",
    "secondaryColor": "#00205B",
    "bodyColor": "#BA0C2F",
    "flag": {
      "type": "cross_double",
      "colors": [
        "#BA0C2F",
        "#FFFFFF",
        "#00205B"
      ]
    },
    "description": "Fjord Storm"
  },
  {
    "id": "denmark",
    "name": "Denmark",
    "code": "DK",
    "primaryColor": "#C60C30",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#C60C30",
    "flag": {
      "type": "cross_nordic",
      "colors": [
        "#C60C30",
        "#FFFFFF"
      ]
    },
    "description": "Dannebrog"
  },
  {
    "id": "finland",
    "name": "Finland",
    "code": "FI",
    "primaryColor": "#003580",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#003580",
    "flag": {
      "type": "cross_nordic",
      "colors": [
        "#FFFFFF",
        "#003580"
      ]
    },
    "description": "Nordic Frost"
  },
  {
    "id": "iceland",
    "name": "Iceland",
    "code": "IS",
    "primaryColor": "#02529C",
    "secondaryColor": "#DC1E35",
    "bodyColor": "#02529C",
    "flag": {
      "type": "cross_double",
      "colors": [
        "#02529C",
        "#FFFFFF",
        "#DC1E35"
      ]
    },
    "description": "Geysir Burst"
  },
  {
    "id": "switzerland",
    "name": "Switzerland",
    "code": "CH",
    "primaryColor": "#FF0000",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#FF0000",
    "flag": {
      "type": "swiss_cross",
      "colors": [
        "#FF0000",
        "#FFFFFF"
      ]
    },
    "description": "Alpine Shield"
  },
  {
    "id": "austria",
    "name": "Austria",
    "code": "AT",
    "primaryColor": "#ED2939",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#ED2939",
    "flag": {
      "type": "horizontal_3",
      "colors": [
        "#ED2939",
        "#FFFFFF",
        "#ED2939"
      ]
    },
    "description": "Eagle Claw"
  },
  {
    "id": "belgium",
    "name": "Belgium",
    "code": "BE",
    "primaryColor": "#ED2939",
    "secondaryColor": "#FAE042",
    "bodyColor": "#ED2939",
    "flag": {
      "type": "vertical_3",
      "colors": [
        "#000000",
        "#FAE042",
        "#ED2939"
      ]
    },
    "description": "Red Devil"
  },
  {
    "id": "ireland",
    "name": "Ireland",
    "code": "IE",
    "primaryColor": "#169B62",
    "secondaryColor": "#FF883E",
    "bodyColor": "#169B62",
    "flag": {
      "type": "vertical_3",
      "colors": [
        "#169B62",
        "#FFFFFF",
        "#FF883E"
      ]
    },
    "description": "Shamrock Smash"
  },
  {
    "id": "poland",
    "name": "Poland",
    "code": "PL",
    "primaryColor": "#DC143C",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#DC143C",
    "flag": {
      "type": "horizontal_2",
      "colors": [
        "#FFFFFF",
        "#DC143C"
      ]
    },
    "description": "White Eagle"
  },
  {
    "id": "ukraine",
    "name": "Ukraine",
    "code": "UA",
    "primaryColor": "#0057B7",
    "secondaryColor": "#FFDD00",
    "bodyColor": "#0057B7",
    "flag": {
      "type": "horizontal_2",
      "colors": [
        "#0057B7",
        "#FFDD00"
      ]
    },
    "description": "Cossack Steel"
  },
  {
    "id": "czechia",
    "name": "Czech Republic",
    "code": "CZ",
    "primaryColor": "#11457E",
    "secondaryColor": "#D7141A",
    "bodyColor": "#11457E",
    "flag": {
      "type": "triangle_left_split",
      "colors": [
        "#FFFFFF",
        "#D7141A",
        "#11457E"
      ]
    },
    "description": "Bohemian Lion"
  },
  {
    "id": "greece",
    "name": "Greece",
    "code": "GR",
    "primaryColor": "#0D5EAF",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#0D5EAF",
    "flag": {
      "type": "greece_canton",
      "colors": [
        "#0D5EAF",
        "#FFFFFF"
      ]
    },
    "description": "Spartan Charge"
  },
  {
    "id": "turkey",
    "name": "Turkey",
    "code": "TR",
    "primaryColor": "#E30A17",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#E30A17",
    "flag": {
      "type": "star_crescent",
      "colors": [
        "#E30A17",
        "#FFFFFF"
      ]
    },
    "description": "Ottoman Roar"
  },
  {
    "id": "croatia",
    "name": "Croatia",
    "code": "HR",
    "primaryColor": "#FF0000",
    "secondaryColor": "#171796",
    "bodyColor": "#171796",
    "flag": {
      "type": "horizontal_3_checker",
      "colors": [
        "#FF0000",
        "#FFFFFF",
        "#171796"
      ]
    },
    "description": "Checker Shield"
  },
  {
    "id": "hungary",
    "name": "Hungary",
    "code": "HU",
    "primaryColor": "#CE2939",
    "secondaryColor": "#477050",
    "bodyColor": "#CE2939",
    "flag": {
      "type": "horizontal_3",
      "colors": [
        "#CE2939",
        "#FFFFFF",
        "#477050"
      ]
    },
    "description": "Magyar Punch"
  },
  {
    "id": "romania",
    "name": "Romania",
    "code": "RO",
    "primaryColor": "#002B7F",
    "secondaryColor": "#CE1126",
    "bodyColor": "#002B7F",
    "flag": {
      "type": "vertical_3",
      "colors": [
        "#002B7F",
        "#FCD116",
        "#CE1126"
      ]
    },
    "description": "Carpathian"
  },
  {
    "id": "bulgaria",
    "name": "Bulgaria",
    "code": "BG",
    "primaryColor": "#00966E",
    "secondaryColor": "#D62612",
    "bodyColor": "#00966E",
    "flag": {
      "type": "horizontal_3",
      "colors": [
        "#FFFFFF",
        "#00966E",
        "#D62612"
      ]
    },
    "description": "Balkan Tiger"
  },
  {
    "id": "serbia",
    "name": "Serbia",
    "code": "RS",
    "primaryColor": "#C6363C",
    "secondaryColor": "#0C4076",
    "bodyColor": "#0C4076",
    "flag": {
      "type": "horizontal_3",
      "colors": [
        "#C6363C",
        "#0C4076",
        "#FFFFFF"
      ]
    },
    "description": "White Eagle"
  },
  {
    "id": "slovakia",
    "name": "Slovakia",
    "code": "SK",
    "primaryColor": "#0B3F82",
    "secondaryColor": "#EE1C25",
    "bodyColor": "#0B3F82",
    "flag": {
      "type": "horizontal_3_shield",
      "colors": [
        "#FFFFFF",
        "#0B3F82",
        "#EE1C25"
      ]
    },
    "description": "Tatra Guard"
  },
  {
    "id": "slovenia",
    "name": "Slovenia",
    "code": "SI",
    "primaryColor": "#005CE6",
    "secondaryColor": "#ED1C24",
    "bodyColor": "#005CE6",
    "flag": {
      "type": "horizontal_3_shield",
      "colors": [
        "#FFFFFF",
        "#005CE6",
        "#ED1C24"
      ]
    },
    "description": "Triglav Spirit"
  },
  {
    "id": "estonia",
    "name": "Estonia",
    "code": "EE",
    "primaryColor": "#0072CE",
    "secondaryColor": "#000000",
    "bodyColor": "#0072CE",
    "flag": {
      "type": "horizontal_3",
      "colors": [
        "#0072CE",
        "#000000",
        "#FFFFFF"
      ]
    },
    "description": "Baltic Wave"
  },
  {
    "id": "latvia",
    "name": "Latvia",
    "code": "LV",
    "primaryColor": "#9E3039",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#9E3039",
    "flag": {
      "type": "latvia_bars",
      "colors": [
        "#9E3039",
        "#FFFFFF"
      ]
    },
    "description": "Amber Knight"
  },
  {
    "id": "lithuania",
    "name": "Lithuania",
    "code": "LT",
    "primaryColor": "#FDB913",
    "secondaryColor": "#006A44",
    "bodyColor": "#006A44",
    "flag": {
      "type": "horizontal_3",
      "colors": [
        "#FDB913",
        "#006A44",
        "#C1272D"
      ]
    },
    "description": "Iron Wolf"
  },
  {
    "id": "monaco",
    "name": "Monaco",
    "code": "MC",
    "primaryColor": "#CE1126",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#CE1126",
    "flag": {
      "type": "horizontal_2",
      "colors": [
        "#CE1126",
        "#FFFFFF"
      ]
    },
    "description": "Riviera Speed"
  },
  {
    "id": "luxembourg",
    "name": "Luxembourg",
    "code": "LU",
    "primaryColor": "#EA141D",
    "secondaryColor": "#00A1DE",
    "bodyColor": "#00A1DE",
    "flag": {
      "type": "horizontal_3",
      "colors": [
        "#EA141D",
        "#FFFFFF",
        "#00A1DE"
      ]
    },
    "description": "Red Lion"
  },
  {
    "id": "south_africa",
    "name": "South Africa",
    "code": "ZA",
    "primaryColor": "#007A4D",
    "secondaryColor": "#DE3831",
    "bodyColor": "#007A4D",
    "flag": {
      "type": "south_africa_y",
      "colors": [
        "#007A4D",
        "#DE3831",
        "#002395",
        "#FFB612",
        "#000000",
        "#FFFFFF"
      ]
    },
    "description": "Springbok Rush"
  },
  {
    "id": "nigeria",
    "name": "Nigeria",
    "code": "NG",
    "primaryColor": "#008751",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#008751",
    "flag": {
      "type": "vertical_3",
      "colors": [
        "#008751",
        "#FFFFFF",
        "#008751"
      ]
    },
    "description": "Super Eagle"
  },
  {
    "id": "ghana",
    "name": "Ghana",
    "code": "GH",
    "primaryColor": "#EF3340",
    "secondaryColor": "#009739",
    "bodyColor": "#FFD100",
    "flag": {
      "type": "horizontal_3_star",
      "colors": [
        "#EF3340",
        "#FFD100",
        "#009739",
        "#000000"
      ]
    },
    "description": "Black Star"
  },
  {
    "id": "senegal",
    "name": "Senegal",
    "code": "SN",
    "primaryColor": "#00853F",
    "secondaryColor": "#E31B23",
    "bodyColor": "#00853F",
    "flag": {
      "type": "vertical_3_star",
      "colors": [
        "#00853F",
        "#FDEF42",
        "#E31B23",
        "#00853F"
      ]
    },
    "description": "Teranga Lion"
  },
  {
    "id": "kenya",
    "name": "Kenya",
    "code": "KE",
    "primaryColor": "#922529",
    "secondaryColor": "#006600",
    "bodyColor": "#922529",
    "flag": {
      "type": "horizontal_3_shield_kenya",
      "colors": [
        "#000000",
        "#922529",
        "#006600",
        "#FFFFFF"
      ]
    },
    "description": "Harambee"
  },
  {
    "id": "morocco",
    "name": "Morocco",
    "code": "MA",
    "primaryColor": "#C1272D",
    "secondaryColor": "#006233",
    "bodyColor": "#C1272D",
    "flag": {
      "type": "star_center",
      "colors": [
        "#C1272D",
        "#006233"
      ]
    },
    "description": "Atlas Lion"
  },
  {
    "id": "algeria",
    "name": "Algeria",
    "code": "DZ",
    "primaryColor": "#006233",
    "secondaryColor": "#D21034",
    "bodyColor": "#006233",
    "flag": {
      "type": "split_crescent",
      "colors": [
        "#006233",
        "#FFFFFF",
        "#D21034"
      ]
    },
    "description": "Desert Fox"
  },
  {
    "id": "tunisia",
    "name": "Tunisia",
    "code": "TN",
    "primaryColor": "#E70013",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#E70013",
    "flag": {
      "type": "crescent_circle",
      "colors": [
        "#E70013",
        "#FFFFFF"
      ]
    },
    "description": "Carthage Eagle"
  },
  {
    "id": "cameroon",
    "name": "Cameroon",
    "code": "CM",
    "primaryColor": "#007A5E",
    "secondaryColor": "#CE1126",
    "bodyColor": "#007A5E",
    "flag": {
      "type": "vertical_3_star",
      "colors": [
        "#007A5E",
        "#CE1126",
        "#FCD116",
        "#FCD116"
      ]
    },
    "description": "Indomitable Lion"
  },
  {
    "id": "ivory_coast",
    "name": "Ivory Coast",
    "code": "CI",
    "primaryColor": "#F77F00",
    "secondaryColor": "#009E60",
    "bodyColor": "#F77F00",
    "flag": {
      "type": "vertical_3",
      "colors": [
        "#F77F00",
        "#FFFFFF",
        "#009E60"
      ]
    },
    "description": "Elephant Power"
  },
  {
    "id": "egypt",
    "name": "Egypt",
    "code": "EG",
    "primaryColor": "#CE1126",
    "secondaryColor": "#000000",
    "bodyColor": "#CE1126",
    "flag": {
      "type": "horizontal_3_eagle",
      "colors": [
        "#CE1126",
        "#FFFFFF",
        "#000000",
        "#C09300"
      ]
    },
    "description": "Pharaoh Blast"
  },
  {
    "id": "ethiopia",
    "name": "Ethiopia",
    "code": "ET",
    "primaryColor": "#009A44",
    "secondaryColor": "#EF3340",
    "bodyColor": "#009A44",
    "flag": {
      "type": "horizontal_3_star",
      "colors": [
        "#009A44",
        "#FED100",
        "#EF3340",
        "#0F47AF"
      ]
    },
    "description": "Lucy Heritage"
  },
  {
    "id": "tanzania",
    "name": "Tanzania",
    "code": "TZ",
    "primaryColor": "#1EB53A",
    "secondaryColor": "#00A3DD",
    "bodyColor": "#1EB53A",
    "flag": {
      "type": "diagonal_band",
      "colors": [
        "#1EB53A",
        "#000000",
        "#00A3DD",
        "#FCD116"
      ]
    },
    "description": "Kilimanjaro"
  },
  {
    "id": "uganda",
    "name": "Uganda",
    "code": "UG",
    "primaryColor": "#000000",
    "secondaryColor": "#D90000",
    "bodyColor": "#FCDC04",
    "flag": {
      "type": "horizontal_6_bird",
      "colors": [
        "#000000",
        "#FCDC04",
        "#D90000"
      ]
    },
    "description": "Crested Crane"
  },
  {
    "id": "zimbabwe",
    "name": "Zimbabwe",
    "code": "ZW",
    "primaryColor": "#006400",
    "secondaryColor": "#D40000",
    "bodyColor": "#006400",
    "flag": {
      "type": "triangle_stripes",
      "colors": [
        "#006400",
        "#FFD200",
        "#D40000",
        "#000000"
      ]
    },
    "description": "Great Bird"
  },
  {
    "id": "zambia",
    "name": "Zambia",
    "code": "ZM",
    "primaryColor": "#198A00",
    "secondaryColor": "#EF7D00",
    "bodyColor": "#198A00",
    "flag": {
      "type": "zambia_stripes",
      "colors": [
        "#198A00",
        "#DE2010",
        "#000000",
        "#EF7D00"
      ]
    },
    "description": "Copper Strike"
  },
  {
    "id": "madagascar",
    "name": "Madagascar",
    "code": "MG",
    "primaryColor": "#FC3D32",
    "secondaryColor": "#007E3A",
    "bodyColor": "#FC3D32",
    "flag": {
      "type": "madagascar_split",
      "colors": [
        "#FFFFFF",
        "#FC3D32",
        "#007E3A"
      ]
    },
    "description": "Baobab Titan"
  },
  {
    "id": "saudi_arabia",
    "name": "Saudi Arabia",
    "code": "SA",
    "primaryColor": "#006C35",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#006C35",
    "flag": {
      "type": "solid_sword",
      "colors": [
        "#006C35",
        "#FFFFFF"
      ]
    },
    "description": "Green Falcon"
  },
  {
    "id": "uae",
    "name": "United Arab Emirates",
    "code": "AE",
    "primaryColor": "#00732F",
    "secondaryColor": "#FF0000",
    "bodyColor": "#00732F",
    "flag": {
      "type": "uae_bars",
      "colors": [
        "#FF0000",
        "#00732F",
        "#FFFFFF",
        "#000000"
      ]
    },
    "description": "Falcon Pride"
  },
  {
    "id": "qatar",
    "name": "Qatar",
    "code": "QA",
    "primaryColor": "#8D1B3D",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#8D1B3D",
    "flag": {
      "type": "serrated_split",
      "colors": [
        "#FFFFFF",
        "#8D1B3D"
      ]
    },
    "description": "Maroon Falcon"
  },
  {
    "id": "jordan",
    "name": "Jordan",
    "code": "JO",
    "primaryColor": "#007A3D",
    "secondaryColor": "#CE1126",
    "bodyColor": "#007A3D",
    "flag": {
      "type": "triangle_stripes_star",
      "colors": [
        "#000000",
        "#FFFFFF",
        "#007A3D",
        "#CE1126"
      ]
    },
    "description": "Petra Guard"
  },
  {
    "id": "lebanon",
    "name": "Lebanon",
    "code": "LB",
    "primaryColor": "#EE161F",
    "secondaryColor": "#00A651",
    "bodyColor": "#EE161F",
    "flag": {
      "type": "horizontal_3_cedar",
      "colors": [
        "#EE161F",
        "#FFFFFF",
        "#EE161F",
        "#00A651"
      ]
    },
    "description": "Cedar Punch"
  },
  {
    "id": "iraq",
    "name": "Iraq",
    "code": "IQ",
    "primaryColor": "#CE1126",
    "secondaryColor": "#007A3D",
    "bodyColor": "#CE1126",
    "flag": {
      "type": "horizontal_3_text",
      "colors": [
        "#CE1126",
        "#FFFFFF",
        "#000000",
        "#007A3D"
      ]
    },
    "description": "Mesopotamia"
  },
  {
    "id": "kuwait",
    "name": "Kuwait",
    "code": "KW",
    "primaryColor": "#007A3D",
    "secondaryColor": "#CE1126",
    "bodyColor": "#007A3D",
    "flag": {
      "type": "trapezoid_stripes",
      "colors": [
        "#007A3D",
        "#FFFFFF",
        "#CE1126",
        "#000000"
      ]
    },
    "description": "Gulf Shield"
  },
  {
    "id": "oman",
    "name": "Oman",
    "code": "OM",
    "primaryColor": "#DB161B",
    "secondaryColor": "#008000",
    "bodyColor": "#DB161B",
    "flag": {
      "type": "oman_bars",
      "colors": [
        "#DB161B",
        "#FFFFFF",
        "#008000"
      ]
    },
    "description": "Dagger Master"
  },
  {
    "id": "bahrain",
    "name": "Bahrain",
    "code": "BH",
    "primaryColor": "#DA291C",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#DA291C",
    "flag": {
      "type": "serrated_split",
      "colors": [
        "#FFFFFF",
        "#DA291C"
      ]
    },
    "description": "Pearl Diver"
  },
  {
    "id": "palestine",
    "name": "Palestine",
    "code": "PS",
    "primaryColor": "#000000",
    "secondaryColor": "#007A3D",
    "bodyColor": "#007A3D",
    "flag": {
      "type": "triangle_stripes",
      "colors": [
        "#000000",
        "#FFFFFF",
        "#007A3D",
        "#EE2A35"
      ]
    },
    "description": "Olive Branch"
  },
  {
    "id": "georgia",
    "name": "Georgia",
    "code": "GE",
    "primaryColor": "#FF0000",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#FF0000",
    "flag": {
      "type": "georgia_crosses",
      "colors": [
        "#FFFFFF",
        "#FF0000"
      ]
    },
    "description": "Crusader Cross"
  },
  {
    "id": "azerbaijan",
    "name": "Azerbaijan",
    "code": "AZ",
    "primaryColor": "#00B5E2",
    "secondaryColor": "#509E2F",
    "bodyColor": "#00B5E2",
    "flag": {
      "type": "horizontal_3_crescent",
      "colors": [
        "#00B5E2",
        "#EF3340",
        "#509E2F"
      ]
    },
    "description": "Land of Fire"
  },
  {
    "id": "armenia",
    "name": "Armenia",
    "code": "AM",
    "primaryColor": "#D90012",
    "secondaryColor": "#F2A800",
    "bodyColor": "#0033A0",
    "flag": {
      "type": "horizontal_3",
      "colors": [
        "#D90012",
        "#0033A0",
        "#F2A800"
      ]
    },
    "description": "Mount Ararat"
  },
  {
    "id": "australia",
    "name": "Australia",
    "code": "AU",
    "primaryColor": "#00008B",
    "secondaryColor": "#FFD700",
    "bodyColor": "#0B47A8",
    "flag": {
      "type": "australia_stars",
      "colors": [
        "#00008B",
        "#FFFFFF",
        "#C8102E"
      ]
    },
    "description": "Outback Boxer"
  },
  {
    "id": "new_zealand",
    "name": "New Zealand",
    "code": "NZ",
    "primaryColor": "#00247D",
    "secondaryColor": "#CC142B",
    "bodyColor": "#00247D",
    "flag": {
      "type": "nz_stars",
      "colors": [
        "#00247D",
        "#FFFFFF",
        "#CC142B"
      ]
    },
    "description": "All Black Haka"
  },
  {
    "id": "fiji",
    "name": "Fiji",
    "code": "FJ",
    "primaryColor": "#68BFE5",
    "secondaryColor": "#FFFFFF",
    "bodyColor": "#68BFE5",
    "flag": {
      "type": "fiji_canton",
      "colors": [
        "#68BFE5",
        "#012169",
        "#FFFFFF",
        "#C8102E"
      ]
    },
    "description": "Flying Fijian"
  },
  {
    "id": "papua_new_guinea",
    "name": "Papua New Guinea",
    "code": "PG",
    "primaryColor": "#CE1126",
    "secondaryColor": "#000000",
    "bodyColor": "#CE1126",
    "flag": {
      "type": "diagonal_split_bird",
      "colors": [
        "#000000",
        "#CE1126",
        "#FFCC00",
        "#FFFFFF"
      ]
    },
    "description": "Bird of Paradise"
  }
]
};
