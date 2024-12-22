import {
  BufferGeometry, Color, Group, Material, Mesh, MeshBasicMaterial,
  Object3D,
  Points, PointsMaterial, ShaderMaterial,
  SphereBufferGeometry, Sprite, SpriteMaterial, Texture, TextureLoader
} from "three";

import html2canvas from "html2canvas";

import earthVertex from '../../shaders/earth/vertex.vs';
import earthFragment from '../../shaders/earth/fragment.fs';
import { lon2xyz } from "../Utils/common";
import gsap from "gsap";
import { flyArc } from "../Utils/arc";

export type punctuation = {
  circleColor: number,
  lightColumn: {
    startColor: number, // 起点颜色
    endColor: number, // 终点颜色
  },
}

type options = {
  data: {
    startArray: {
      name: string,
      E: number, // 经度
      N: number, // 维度
    },
    endArray: {
      name: string,
      E: number, // 经度
      N: number, // 维度
    }[]
  }[]
  dom: HTMLElement,
  textures: Record<string, Texture>, // 贴图
  earth: {
    radius: number, // 地球半径
    rotateSpeed: number, // 地球旋转速度
    isRotation: boolean // 地球组是否自转
  }
  satellite: {
    show: boolean, // 是否显示卫星
    rotateSpeed: number, // 旋转速度
    size: number, // 卫星大小
    number: number, // 一个圆环几个球
  },
  punctuation: punctuation,
  flyLine: {
    color: number, // 飞线的颜色
    speed: number, // 飞机拖尾线速度
    flyLineColor: number // 飞行线的颜色
  },
}
type uniforms = {
  glowColor: { value: Color; }
  scale: { type: string; value: number; }
  bias: { type: string; value: number; }
  power: { type: string; value: number; }
  time: { type: string; value: any; }
  isHover: { value: boolean; };
  map: { value: Texture }
}

export default class earth {

  public group: Group;
  public earthGroup: Group;

  public around: BufferGeometry
  public aroundPoints: Points<BufferGeometry, PointsMaterial>;

  public options: options;
  public uniforms: uniforms
  public timeValue: number;

  public earth: Mesh<SphereBufferGeometry, ShaderMaterial>;
  public punctuationMaterial: MeshBasicMaterial;
  public markupPoint: Group;
  public waveMeshArr: Object3D[];

  public circleLineList: any[];
  public circleList: any[];
  public x: number;
  public n: number;
  public isRotation: boolean;
  public flyLineArcGroup: Group;

  constructor(options: options) {

    this.options = options;

    this.group = new Group()
    this.group.name = "group";
    this.group.scale.set(0, 0, 0)
    this.earthGroup = new Group()
    this.group.add(this.earthGroup)
    this.earthGroup.name = "EarthGroup";

    // 标注点效果
    this.markupPoint = new Group()
    this.markupPoint.name = "markupPoint"
    this.waveMeshArr = []

    // 卫星和标签
    this.circleLineList = []
    this.circleList = [];
    this.x = 0;
    this.n = 0;

    // 地球自转
    this.isRotation = this.options.earth.isRotation

    // 扫光动画 shader
    this.timeValue = 100
    this.uniforms = {
      glowColor: {
        value: new Color(0x0cd1eb),
      },
      scale: {
        type: "f",
        value: -1.0,
      },
      bias: {
        type: "f",
        value: 1.0,
      },
      power: {
        type: "f",
        value: 3.3,
      },
      time: {
        type: "f",
        value: this.timeValue,
      },
      isHover: {
        value: false,
      },
      map: {
        value: null,
      },
    };

  }

  async init(): Promise<void> {
    return new Promise(async (resolve) => {

      this.createEarth(); // 创建地球
      await this.createSpriteLabel() // 创建标签
      this.createFlyLine() // 创建飞线

      this.show()
      resolve()
    })
  }

  createEarth() {
    const earth_geometry = new SphereBufferGeometry(
      this.options.earth.radius,
      50,
      50
    );

    const earth_border = new SphereBufferGeometry(
      this.options.earth.radius + 10,
      60,
      60
    );

    const pointMaterial = new PointsMaterial({
      color: 0x81ffff, //设置颜色，默认 0xFFFFFF
      transparent: true,
      sizeAttenuation: true,
      opacity: 0.1,
      vertexColors: false, //定义材料是否使用顶点颜色，默认false ---如果该选项设置为true，则color属性失效
      size: 0.01, //定义粒子的大小。默认为1.0
    })
    const points = new Points(earth_border, pointMaterial); //将模型添加到场景

    this.earthGroup.add(points);

    this.uniforms.map.value = this.options.textures.earth;

    const earth_material = new ShaderMaterial({
      // wireframe:true, // 显示模型线条
      uniforms: this.uniforms,
      vertexShader: earthVertex,
      fragmentShader: earthFragment,
    });

    earth_material.needsUpdate = true;
    this.earth = new Mesh(earth_geometry, earth_material);
    this.earth.name = "earth";
    this.earthGroup.add(this.earth);

  }

  async createSpriteLabel() {
    await Promise.all(this.options.data.map(async item => {
      let cityArry = [];
      cityArry.push(item.startArray);
      cityArry = cityArry.concat(...item.endArray);
      await Promise.all(cityArry.map(async e => {
        const p = lon2xyz(this.options.earth.radius * 1.001, e.E, e.N);
        const div = `<div class="fire-div">${e.name}</div>`;
        const shareContent = document.getElementById("html2canvas");
        shareContent.innerHTML = div;
        const opts = {
          backgroundColor: null, // 背景透明
          scale: 6,
          dpi: window.devicePixelRatio,
        };
        const canvas = await html2canvas(document.getElementById("html2canvas"), opts)
        const dataURL = canvas.toDataURL("image/png");
        const map = new TextureLoader().load(dataURL);
        const material = new SpriteMaterial({
          map: map,
          transparent: true,
        });
        const sprite = new Sprite(material);
        const len = 5 + (e.name.length - 2) * 2;
        sprite.scale.set(len, 3, 1);
        sprite.position.set(p.x * 1.1, p.y * 1.1, p.z * 1.1);
        this.earth.add(sprite);
      }))
    }))
  }

  createFlyLine() {

    this.flyLineArcGroup = new Group();
    this.flyLineArcGroup.userData['flyLineArray'] = []
    this.earthGroup.add(this.flyLineArcGroup)

    this.options.data.forEach((cities) => {
      cities.endArray.forEach(item => {

        // 调用函数flyArc绘制球面上任意两点之间飞线圆弧轨迹
        const arcline = flyArc(
          this.options.earth.radius,
          cities.startArray.E,
          cities.startArray.N,
          item.E,
          item.N,
          this.options.flyLine
        );

        this.flyLineArcGroup.add(arcline); // 飞线插入flyArcGroup中
        this.flyLineArcGroup.userData['flyLineArray'].push(arcline.userData['flyLine'])
      });

    })

  }

  show() {
    gsap.to(this.group.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 2,
      ease: "Quadratic",
    })
  }

  render() {

    this.flyLineArcGroup?.userData['flyLineArray']?.forEach(fly => {
      fly.rotation.z += this.options.flyLine.speed; // 调节飞线速度
      if (fly.rotation.z >= fly.flyEndAngle) fly.rotation.z = 0;
    })

    if (this.isRotation) {
      this.earthGroup.rotation.y += this.options.earth.rotateSpeed;
    }

    this.circleLineList.forEach((e) => {
      e.rotateY(this.options.satellite.rotateSpeed);
    });

    this.uniforms.time.value =
      this.uniforms.time.value < -this.timeValue
        ? this.timeValue
        : this.uniforms.time.value - 1;

    if (this.waveMeshArr.length) {
      this.waveMeshArr.forEach((mesh: Mesh) => {
        mesh.userData['scale'] += 0.007;
        mesh.scale.set(
          mesh.userData['size'] * mesh.userData['scale'],
          mesh.userData['size'] * mesh.userData['scale'],
          mesh.userData['size'] * mesh.userData['scale']
        );
        if (mesh.userData['scale'] <= 1.5) {
          (mesh.material as Material).opacity = (mesh.userData['scale'] - 1) * 2; //2等于1/(1.5-1.0)，保证透明度在0~1之间变化
        } else if (mesh.userData['scale'] > 1.5 && mesh.userData['scale'] <= 2) {
          (mesh.material as Material).opacity = 1 - (mesh.userData['scale'] - 1.5) * 2; //2等于1/(2.0-1.5) mesh缩放2倍对应0 缩放1.5被对应1
        } else {
          mesh.userData['scale'] = 1;
        }
      });
    }

  }

}