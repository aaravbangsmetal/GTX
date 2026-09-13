import { vec3 } from '../shared/math';
import type { Intersection } from './types';

const HWY_POS = 900;

export const MAP_INTERSECTIONS: Intersection[] = [
  {
    id: 'int_ocean_downtown',
    position: vec3(0, 0, 0),
    connectedRoads: ['blvd_ocean', 'blvd_downtown', 'st_conn_2'],
    hasTrafficLight: true,
    type: 'cross',
  },
  {
    id: 'int_havana_downtown',
    position: vec3(-400, 0, 0),
    connectedRoads: ['blvd_havana', 'blvd_downtown', 'st_conn_1', 'st_conn_4'],
    hasTrafficLight: true,
    type: 'cross',
  },
  {
    id: 'int_coast_ocean',
    position: vec3(200, 0, 0),
    connectedRoads: ['blvd_coast', 'blvd_ocean', 'st_conn_2'],
    hasTrafficLight: true,
    type: 'cross',
  },
  {
    id: 'int_port_boulevard',
    position: vec3(-200, 0, -200),
    connectedRoads: ['blvd_port', 'blvd_ocean', 'st_vp_1'],
    hasTrafficLight: true,
    type: 't',
  },
  {
    id: 'int_island_bridge',
    position: vec3(100, 0, 400),
    connectedRoads: ['blvd_island', 'st_conn_3', 'blvd_downtown'],
    hasTrafficLight: true,
    type: 'cross',
  },
  {
    id: 'int_hwy_ne',
    position: vec3(HWY_POS, 0, HWY_POS),
    connectedRoads: ['hwy_north', 'hwy_east'],
    hasTrafficLight: false,
    type: 't',
  },
  {
    id: 'int_hwy_nw',
    position: vec3(-HWY_POS, 0, HWY_POS),
    connectedRoads: ['hwy_north', 'hwy_west'],
    hasTrafficLight: false,
    type: 't',
  },
  {
    id: 'int_hwy_se',
    position: vec3(HWY_POS, 0, -HWY_POS),
    connectedRoads: ['hwy_south', 'hwy_east'],
    hasTrafficLight: false,
    type: 't',
  },
  {
    id: 'int_hwy_sw',
    position: vec3(-HWY_POS, 0, -HWY_POS),
    connectedRoads: ['hwy_south', 'hwy_west'],
    hasTrafficLight: false,
    type: 't',
  },
  {
    id: 'int_dt_center',
    position: vec3(-100, 0, 100),
    connectedRoads: ['st_dt_3', 'st_dt_5', 'st_dt_8'],
    hasTrafficLight: true,
    type: 'cross',
  },
  {
    id: 'int_dt_east',
    position: vec3(100, 0, 100),
    connectedRoads: ['st_dt_4', 'st_dt_6'],
    hasTrafficLight: true,
    type: 'cross',
  },
  {
    id: 'int_ob_pier',
    position: vec3(850, 0, 0),
    connectedRoads: ['st_ob_4', 'st_ob_2'],
    hasTrafficLight: false,
    type: 't',
  },
  {
    id: 'int_lh_main',
    position: vec3(-700, 0, 0),
    connectedRoads: ['st_lh_1', 'st_lh_4', 'blvd_havana'],
    hasTrafficLight: true,
    type: 'cross',
  },
  {
    id: 'int_vp_docks',
    position: vec3(-500, 0, -600),
    connectedRoads: ['st_vp_1', 'st_vp_3'],
    hasTrafficLight: false,
    type: 'cross',
  },
  {
    id: 'int_si_mansion',
    position: vec3(500, 0, 500),
    connectedRoads: ['st_si_1', 'st_si_4', 'blvd_island'],
    hasTrafficLight: true,
    type: 'roundabout',
  },
  {
    id: 'int_spawn_parking',
    position: vec3(200, 0, -150),
    connectedRoads: ['st_ob_6', 'blvd_coast'],
    hasTrafficLight: false,
    type: 't',
  },
];
