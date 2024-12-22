import { CatmullRomCurve3, Mesh, MeshBasicMaterial, PlaneBufferGeometry, TubeGeometry, Vector3 } from "three";


/**
 * 经纬度坐标转球面坐标  
 * @param {地球半径} R  
 * @param {经度(角度值)} longitude 
 * @param {维度(角度值)} latitude
 */
export const lon2xyz = (R:number, longitude:number, latitude:number): Vector3 => {
  let lon = longitude * Math.PI / 180; // 转弧度值
  const lat = latitude * Math.PI / 180; // 转弧度值
  lon = -lon; // js坐标系z坐标轴对应经度-90度，而不是90度

  // 经纬度坐标转球面坐标计算公式
  const x = R * Math.cos(lat) * Math.cos(lon);
  const y = R * Math.sin(lat);
  const z = R * Math.cos(lat) * Math.sin(lon);
  // 返回球面坐标
  return new Vector3(x, y, z);
}

// 光柱底座矩形平面
export const createPointMesh = (options: {
  radius: number, lon: number,
  lat: number, material: MeshBasicMaterial
}) => {

  const geometry = new PlaneBufferGeometry(1, 1); //默认在XOY平面上
  const mesh = new Mesh(geometry, options.material);
  // 经纬度转球面坐标
  const coord = lon2xyz(options.radius * 1.001, options.lon, options.lat);
  const size = options.radius * 0.05; // 矩形平面Mesh的尺寸
  mesh.scale.set(size, size, size); // 设置mesh大小

  // 设置mesh位置
  mesh.position.set(coord.x, coord.y, coord.z);
  const coordVec3 = new Vector3(coord.x, coord.y, coord.z).normalize();
  const meshNormal = new Vector3(0, 0, 1);
  mesh.quaternion.setFromUnitVectors(meshNormal, coordVec3);
  return mesh;

}

// 获取点
export const getCirclePoints = (option) => {
  const list = [];
  for (
    let j = 0;
    j < 2 * Math.PI - 0.1;
    j += (2 * Math.PI) / (option.number || 100)
  ) {
    list.push([
      parseFloat((Math.cos(j) * (option.radius || 10)).toFixed(2)),
      0,
      parseFloat((Math.sin(j) * (option.radius || 10)).toFixed(2)),
    ]);
  }
  if (option.closed) list.push(list[0]);
  return list;
}

// 创建线

/**
 * 创建动态的线
 */
export const createAnimateLine = (option) => {
  // 由多个点数组构成的曲线 通常用于道路
  const l = [];
  option.pointList.forEach((e) =>
    l.push(new Vector3(e[0], e[1], e[2]))
  );
  const curve = new CatmullRomCurve3(l); // 曲线路径

  // 管道体
  const tubeGeometry = new TubeGeometry(
    curve,
    option.number || 50,
    option.radius || 1,
    option.radialSegments
  );
  return new Mesh(tubeGeometry, option.material);
}