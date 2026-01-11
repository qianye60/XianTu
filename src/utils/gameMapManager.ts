// Pixi.js 游戏地图管理器（不使用 pixi-viewport，手动实现交互）
import * as PIXI from 'pixi.js';
import type { GameMapConfig, GameCoordinates, ViewportState } from '@/types/gameMap';
import type { WorldLocation } from '@/types/location';
import type { CultivationContinent } from '@/types/worldMap';

/**
 * 游戏地图管理器
 * 负责管理Pixi.js应用、容器、图层和地图元素
 */
export class GameMapManager {
  private app: PIXI.Application;
  private worldContainer: PIXI.Container; // 替代 viewport
  private layers: Map<number, PIXI.Container>;
  private config: GameMapConfig;
  private locationSprites: Map<string, PIXI.Container> = new Map();
  private eventCallbacks: Map<string, ((data?: unknown) => void)[]> = new Map();
  private continentBounds: Map<string, {
    bounds: { x: number; y: number }[];
    data: {
      id: string;
      name?: string;
      description?: string;
      特点?: string;
      主要势力?: string[]
    }
  }> = new Map();

  // 手动实现的交互状态
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private lastPosition = { x: 0, y: 0 };
  private dragDistance = 0;

  // 双指缩放状态
  private isPinching = false;
  private initialPinchDistance = 0;
  private initialPinchScale = 1;
  private pinchCenter = { x: 0, y: 0 };

  // 保存绑定的事件处理函数引用，用于正确移除监听器
  private boundOnDragStart: (e: MouseEvent) => void;
  private boundOnDragMove: (e: MouseEvent) => void;
  private boundOnDragEnd: () => void;
  private boundOnTouchStart: (e: TouchEvent) => void;
  private boundOnTouchMove: (e: TouchEvent) => void;
  private boundOnTouchEnd: (e: TouchEvent) => void;
  private boundOnWheel: (e: WheelEvent) => void;

  constructor(canvas: HTMLCanvasElement, config: GameMapConfig) {
    this.config = config;

    // 绑定事件处理函数
    this.boundOnDragStart = this.onDragStart.bind(this);
    this.boundOnDragMove = this.onDragMove.bind(this);
    this.boundOnDragEnd = this.onDragEnd.bind(this);
    this.boundOnTouchStart = this.onTouchStart.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchEnd = this.onTouchEnd.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);

    // 获取 canvas 的实际尺寸
    const rect = canvas.getBoundingClientRect();
    const canvasWidth = rect.width || canvas.clientWidth || 800;
    const canvasHeight = rect.height || canvas.clientHeight || 600;

    // 初始化Pixi应用（Pixi.js v7 同步方式）
    this.app = new PIXI.Application({
      view: canvas,
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: 0xf8fafc,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      eventMode: 'none', // 禁用 PixiJS 内置事件系统
    });

    // 完全禁用 PixiJS 的事件系统
    if (this.app.renderer.events) {
      this.app.renderer.events.destroy();
    }

    console.log('[地图管理器] Pixi应用初始化完成');

    // 创建世界容器替代 viewport
    this.worldContainer = new PIXI.Container();
    this.worldContainer.sortableChildren = true;
    this.worldContainer.eventMode = 'none';
    this.worldContainer.interactiveChildren = false;
    this.app.stage.addChild(this.worldContainer);

    // 初始化图层
    this.layers = new Map();
    this.initLayers();

    // 绘制背景
    this.drawBackground();

    // 设置交互功能
    this.setupDragInteraction();

    // 初始化视图：先设置缩放，再居中（顺序很重要！）
    this.setZoom(0.5, false);
    this.centerTo(config.width / 2, config.height / 2, false);

    console.log('[地图管理器] 初始化完成', {
      worldSize: `${config.width}x${config.height}`,
      screenSize: `${canvasWidth}x${canvasHeight}`,
      initialZoom: 0.5,
      initialCenter: { x: config.width / 2, y: config.height / 2 },
    });
  }

  /**
   * 设置拖拽和缩放交互
   */
  private setupDragInteraction() {
    const canvas = this.app.view as HTMLCanvasElement;

    // 鼠标拖拽事件
    canvas.addEventListener('mousedown', this.boundOnDragStart);
    canvas.addEventListener('mousemove', this.boundOnDragMove);
    canvas.addEventListener('mouseup', this.boundOnDragEnd);
    canvas.addEventListener('mouseleave', this.boundOnDragEnd);

    // 触摸事件
    canvas.addEventListener('touchstart', this.boundOnTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.boundOnTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.boundOnTouchEnd);

    // 滚轮缩放事件
    canvas.addEventListener('wheel', this.boundOnWheel, { passive: false });
  }

  /**
   * 鼠标按下开始拖拽
   */
  private onDragStart(e: MouseEvent) {
    this.isDragging = true;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.lastPosition = { x: this.worldContainer.x, y: this.worldContainer.y };
    this.dragDistance = 0;
    (this.app.view as HTMLCanvasElement).style.cursor = 'grabbing';

    // 记录点击位置，用于后续判断是否为点击事件
    this.clickStartPos = { x: e.clientX, y: e.clientY };
    this.clickStartTime = Date.now();
  }

  private clickStartPos = { x: 0, y: 0 };
  private clickStartTime = 0;

  /**
   * 鼠标移动拖拽
   */
  private onDragMove(e: MouseEvent) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;

    // 累计拖拽距离
    this.dragDistance += Math.abs(dx - (this.worldContainer.x - this.lastPosition.x)) +
                         Math.abs(dy - (this.worldContainer.y - this.lastPosition.y));

    this.worldContainer.x = this.lastPosition.x + dx;
    this.worldContainer.y = this.lastPosition.y + dy;
  }

  /**
   * 鼠标松开结束拖拽
   */
  private onDragEnd(e?: MouseEvent) {
    // 判断是否为点击事件（拖拽距离小于10px且时间小于500ms）
    if (e && this.isDragging) {
      const dt = Date.now() - this.clickStartTime;

      console.log('[地图管理器] 拖拽结束:', { dragDistance: this.dragDistance, time: dt });

      if (this.dragDistance < 10 && dt < 500) {
        // 这是一个点击事件，进行手动点击检测
        console.log('[地图管理器] 判定为点击事件');
        this.handleClick(e);
      } else {
        console.log('[地图管理器] 判定为拖拽事件，不触发点击');
      }
    }

    this.isDragging = false;
    this.dragDistance = 0;
    (this.app.view as HTMLCanvasElement).style.cursor = 'grab';
  }

  /**
   * 手动处理点击事件
   */
  private handleClick(e: MouseEvent) {
    const canvas = this.app.view as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();

    // 获取鼠标在 canvas 上的位置
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 转换为世界坐标
    const scale = this.worldContainer.scale.x;
    const worldX = (mouseX - this.worldContainer.x) / scale;
    const worldY = (mouseY - this.worldContainer.y) / scale;

    // 优先检测地点（更精确的点击范围）
    const locationLayer = this.layers.get(4);
    if (locationLayer) {
      let nearestLocation: any = null;
      let nearestDistance = Infinity;

      locationLayer.children.forEach((child) => {
        if (!(child instanceof PIXI.Container)) return;
        const userData = (child as any).userData;
        if (!userData) return;

        const distance = Math.sqrt(
          Math.pow(worldX - child.x, 2) + Math.pow(worldY - child.y, 2)
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestLocation = userData;
        }
      });

      // 缩小点击半径到 50 像素（世界坐标）
      if (nearestLocation && nearestDistance < 50) {
        console.log(`[地图] 点击地点: ${nearestLocation.data.name}，距离: ${nearestDistance.toFixed(0)}`);
        this.emit('locationClick', {
          ...nearestLocation.data,
          clickPosition: { x: mouseX, y: mouseY }
        });
        return;
      }
    }

    // 如果没有点击到地点，检测势力范围
    const territoryLayer = this.layers.get(3);
    if (territoryLayer) {
      for (const child of territoryLayer.children) {
        if (child instanceof PIXI.Graphics) {
          const userData = (child as any).userData;
          if (userData && userData.type === 'location') {
            // 检测点是否在势力范围内
            const bounds = (child as any).territoryBounds;
            if (bounds && this.isPointInPolygon(worldX, worldY, bounds)) {
              console.log(`[地图] 点击势力范围: ${userData.data.name}`);
              this.emit('locationClick', {
                ...userData.data,
                clickPosition: { x: mouseX, y: mouseY }
              });
              return;
            }
          }
        }
      }
    }

    // 如果没有点击到势力，检测大陆（使用自定义算法）
    console.log(`[地图] 检测大陆点击，世界坐标: (${worldX.toFixed(0)}, ${worldY.toFixed(0)})，共有${this.continentBounds.size}个大陆`);

    const matchedContinents: Array<{
      id: string;
      data: {
        id: string;
        name?: string;
        description?: string;
        特点?: string;
        主要势力?: string[]
      };
      area: number
    }> = [];

    this.continentBounds.forEach((continent, id) => {
      const isInside = this.isPointInPolygon(worldX, worldY, continent.bounds);
      console.log(`[地图] 检测大陆 "${continent.data.name}":`, {
        isInside,
        bounds: continent.bounds,
        boundsCount: continent.bounds.length
      });

      if (isInside) {
        // 计算多边形面积（用于找到最小的匹配区域）
        const area = this.calculatePolygonArea(continent.bounds);
        matchedContinents.push({ id, data: continent.data, area });
      }
    });

    // 如果有多个匹配，选择面积最小的（最精确的）
    if (matchedContinents.length > 0) {
      matchedContinents.sort((a, b) => a.area - b.area);
      const matched = matchedContinents[0];
      console.log(`[地图] 点击大陆: ${matched.data.name}（共匹配${matchedContinents.length}个大陆，选择最小的）`);
      this.emit('continentClick', {
        ...matched.data,
        clickPosition: { x: mouseX, y: mouseY }
      });
      return;
    }

    console.log('[地图] 点击空白区域');
  }

  /**
   * 触发点击事件
   */
  private emitClickEvent(userData: any) {
    if (userData.type === 'location') {
      this.emit('locationClick', userData.data);
    } else if (userData.type === 'continent') {
      this.emit('continentClick', userData.data);
    }
  }


  /**
   * 计算两个触摸点之间的距离
   */
  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 计算两个触摸点的中心点
   */
  private getTouchCenter(touches: TouchList): { x: number; y: number } {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }

  /**
   * 触摸开始
   */
  private onTouchStart(e: TouchEvent) {
    e.preventDefault();

    if (e.touches.length === 2) {
      // 双指触摸 - 开始缩放
      this.isDragging = false;
      this.isPinching = true;
      this.initialPinchDistance = this.getTouchDistance(e.touches);
      this.initialPinchScale = this.worldContainer.scale.x;
      this.pinchCenter = this.getTouchCenter(e.touches);
      this.lastPosition = { x: this.worldContainer.x, y: this.worldContainer.y };
    } else if (e.touches.length === 1) {
      // 单指触摸 - 开始拖拽
      this.isPinching = false;
      const touch = e.touches[0];
      this.isDragging = true;
      this.dragStart = { x: touch.clientX, y: touch.clientY };
      this.lastPosition = { x: this.worldContainer.x, y: this.worldContainer.y };
      this.dragDistance = 0;
    }
  }

  /**
   * 触摸移动
   */
  private onTouchMove(e: TouchEvent) {
    e.preventDefault();

    if (e.touches.length === 2 && this.isPinching) {
      // 双指缩放
      const currentDistance = this.getTouchDistance(e.touches);
      const currentCenter = this.getTouchCenter(e.touches);

      // 计算缩放比例
      const scale = (currentDistance / this.initialPinchDistance) * this.initialPinchScale;

      // 限制缩放范围
      const minScale = this.config.minZoom || 0.1;
      const maxScale = this.config.maxZoom || 4;
      const clampedScale = Math.max(minScale, Math.min(maxScale, scale));

      // 计算缩放中心点在世界坐标系中的位置
      const worldPosX = (this.pinchCenter.x - this.lastPosition.x) / this.initialPinchScale;
      const worldPosY = (this.pinchCenter.y - this.lastPosition.y) / this.initialPinchScale;

      // 应用缩放
      this.worldContainer.scale.set(clampedScale);

      // 调整位置，使缩放中心点保持不变，同时支持平移
      const centerDx = currentCenter.x - this.pinchCenter.x;
      const centerDy = currentCenter.y - this.pinchCenter.y;
      this.worldContainer.x = this.pinchCenter.x - worldPosX * clampedScale + centerDx;
      this.worldContainer.y = this.pinchCenter.y - worldPosY * clampedScale + centerDy;
    } else if (e.touches.length === 1 && this.isDragging && !this.isPinching) {
      // 单指拖拽
      const touch = e.touches[0];
      const dx = touch.clientX - this.dragStart.x;
      const dy = touch.clientY - this.dragStart.y;

      // 累计拖拽距离
      this.dragDistance += Math.abs(dx - (this.worldContainer.x - this.lastPosition.x)) +
                           Math.abs(dy - (this.worldContainer.y - this.lastPosition.y));

      this.worldContainer.x = this.lastPosition.x + dx;
      this.worldContainer.y = this.lastPosition.y + dy;
    }
  }

  /**
   * 触摸结束
   */
  private onTouchEnd(e: TouchEvent) {
    // 如果还有触摸点，可能是从双指变为单指
    if (e.touches.length === 1 && this.isPinching) {
      // 从双指缩放切换到单指拖拽
      this.isPinching = false;
      this.isDragging = true;
      const touch = e.touches[0];
      this.dragStart = { x: touch.clientX, y: touch.clientY };
      this.lastPosition = { x: this.worldContainer.x, y: this.worldContainer.y };
      this.dragDistance = 0;
    } else if (e.touches.length === 0) {
      // 所有触摸结束
      this.isDragging = false;
      this.isPinching = false;
    }
  }

  /**
   * 滚轮缩放
   */
  private onWheel(e: WheelEvent) {
    e.preventDefault();

    // 计算缩放增量
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = this.worldContainer.scale.x * delta;

    // 限制缩放范围
    const minScale = this.config.minZoom || 0.1;
    const maxScale = this.config.maxZoom || 4;
    const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));

    // 获取鼠标在世界坐标系中的位置
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // 计算鼠标在世界容器中的位置（缩放前）
    const worldPosX = (mouseX - this.worldContainer.x) / this.worldContainer.scale.x;
    const worldPosY = (mouseY - this.worldContainer.y) / this.worldContainer.scale.y;

    // 应用新的缩放
    this.worldContainer.scale.set(clampedScale);

    // 调整位置，使鼠标指向的世界坐标保持不变
    this.worldContainer.x = mouseX - worldPosX * clampedScale;
    this.worldContainer.y = mouseY - worldPosY * clampedScale;
  }

  /**
   * 初始化所有图层
   */
  private initLayers() {
    // 创建各个图层容器
    const layerOrder = [0, 1, 2, 3, 4, 5, 6]; // MapLayer枚举值
    layerOrder.forEach((layer) => {
      const container = new PIXI.Container();
      container.sortableChildren = true;
      this.layers.set(layer, container);
      this.worldContainer.addChild(container);
    });

    console.log('[地图管理器] 图层初始化完成，共', this.layers.size, '个图层');
  }

  /**
   * 绘制背景
   */
  private drawBackground() {
    const bgLayer = this.layers.get(0); // MapLayer.BACKGROUND
    if (!bgLayer) return;

    // 创建渐变背景
    const bg = new PIXI.Graphics();
    bg.beginFill(0xf8fafc);
    bg.drawRect(0, 0, this.config.width, this.config.height);
    bg.endFill();
    bgLayer.addChild(bg);

    // 绘制网格
    const grid = new PIXI.Graphics();
    const gridSize = this.config.tileSize;
    grid.lineStyle(0.5, 0xcbd5e1, 0.3);

    // 垂直线
    for (let x = 0; x <= this.config.width; x += gridSize) {
      grid.moveTo(x, 0);
      grid.lineTo(x, this.config.height);
    }

    // 水平线
    for (let y = 0; y <= this.config.height; y += gridSize) {
      grid.moveTo(0, y);
      grid.lineTo(this.config.width, y);
    }

    bgLayer.addChild(grid);
  }

  /**
   * 添加大陆
   */
  addContinent(continent: CultivationContinent) {
    const continentLayer = this.layers.get(2); // MapLayer.CONTINENT
    if (!continentLayer) return;

    const bounds = continent.continent_bounds || continent.大洲边界;
    if (!bounds || bounds.length < 3) return;

    // 绘制大陆边界多边形
    const polygon = new PIXI.Graphics();

    // 填充
    polygon.beginFill(0x3b82f6, 0.12);
    polygon.moveTo(bounds[0].x, bounds[0].y);
    for (let i = 1; i < bounds.length; i++) {
      polygon.lineTo(bounds[i].x, bounds[i].y);
    }
    polygon.closePath();
    polygon.endFill();

    // 边框
    polygon.lineStyle(2.5, 0x2563eb, 0.75);
    polygon.moveTo(bounds[0].x, bounds[0].y);
    for (let i = 1; i < bounds.length; i++) {
      polygon.lineTo(bounds[i].x, bounds[i].y);
    }
    polygon.closePath();

    // 禁用交互，使用手动点击检测
    polygon.eventMode = 'none';

    // 存储用户数据，用于点击检测
    const continentData = {
      id: continent.id,
      name: continent.name || continent.名称,
      description: continent.description || continent.描述,
      特点: continent.特点,
      主要势力: continent.主要势力,
    };

    (polygon as any).userData = {
      type: 'continent',
      data: continentData,
    };

    // 存储大陆边界数据用于点击检测
    const continentId = continent.id || `continent_${Date.now()}_${Math.random()}`;
    this.continentBounds.set(continentId, {
      bounds: bounds,
      data: continentData,
    });

    continentLayer.addChild(polygon);

    // 添加大陆名称标签（超大背景水印样式）
    const center = this.calculatePolygonCenter(bounds);
    const label = new PIXI.Text(continent.name || continent.名称 || '未知大陆', {
      fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
      fontSize: 280, // 超大字体，像背景水印
      fill: 0x1e40af,
      fontWeight: 'bold',
      align: 'center',
      stroke: '#ffffff',
      strokeThickness: 8,
    });
    label.anchor.set(0.5);
    label.x = center.x;
    label.y = center.y;
    label.alpha = 0.2; // 半透明，像水印
    label.eventMode = 'none';

    continentLayer.addChild(label);

    console.log('[地图管理器] 添加大陆:', continent.name || continent.名称, '| ID:', continentId, '| 边界点数:', bounds.length, '| 当前存储的大陆数:', this.continentBounds.size);
  }

  /**
   * 添加地点标记
   */
  addLocation(location: WorldLocation) {
    const locationLayer = this.layers.get(4); // MapLayer.LOCATION
    if (!locationLayer) return;

    // 势力等级决定图标缩放（基础缩放提升至2.5倍）
    const levelText = String(location.等级 || (location as any).level || '').toLowerCase();
    let scale = 2.5; // 提升基础缩放
    if (levelText.includes('超')) scale = 3.5;
    else if (levelText.includes('一')) scale = 3.2;
    else if (levelText.includes('二')) scale = 2.8;
    else if (levelText.includes('三')) scale = 2.5;

    // 创建地点容器
    const locationContainer = new PIXI.Container();
    locationContainer.x = location.coordinates?.x || 0;
    locationContainer.y = location.coordinates?.y || 0;
    // 禁用交互，使用手动点击检测
    locationContainer.eventMode = 'none';

    // 绘制图标
    const icon = this.createLocationIcon(location.type, location.iconColor || '#6B7280');
    icon.scale.set(scale);
    locationContainer.addChild(icon);

    // 添加文字标签（增大字体）
    const label = new PIXI.Text(location.name, {
      fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
      fontSize: 38 * scale, // 增大标签字体
      fill: location.iconColor || '#6B7280',
      fontWeight: '700',
      align: 'center',
      stroke: '#ffffff',
      strokeThickness: 5,
    });
    label.anchor.set(0.5, 0);
    label.y = 32 * scale; // 调整标签位置
    label.eventMode = 'none';
    locationContainer.addChild(label);

    // 存储用户数据，用于点击检测
    (locationContainer as any).userData = {
      type: 'location',
      data: {
        id: location.id,
        name: location.name,
        coordinates: location.coordinates || { x: 0, y: 0 },
        location: location,
      },
    };

    locationLayer.addChild(locationContainer);
    this.locationSprites.set(location.id, locationContainer);

    console.log('[地图管理器] 添加地点:', location.name, `(${location.coordinates?.x}, ${location.coordinates?.y})`);
  }

  /**
   * 创建地点图标（增大尺寸，增强视觉效果）
   */
  private createLocationIcon(type: string, colorStr: string): PIXI.Graphics {
    const graphics = new PIXI.Graphics();
    const color = parseInt(colorStr.replace('#', ''), 16);

    graphics.alpha = 0.95;

    switch (type) {
      case 'natural_landmark':
      case '名山大川':
        // 山形图标（放大2倍）
        graphics.beginFill(color, 0.9);
        graphics.moveTo(0, -24);
        graphics.lineTo(-16, 16);
        graphics.lineTo(16, 16);
        graphics.closePath();
        graphics.endFill();
        // 添加边框
        graphics.lineStyle(2, 0xffffff, 0.8);
        graphics.moveTo(0, -24);
        graphics.lineTo(-16, 16);
        graphics.lineTo(16, 16);
        graphics.closePath();
        break;

      case 'sect_power':
        // 建筑图标（放大2倍）- 仅兼容旧数据
        graphics.beginFill(color, 0.9);
        graphics.drawRect(-16, -16, 32, 32);
        graphics.endFill();
        graphics.lineStyle(2, 0xffffff, 0.8);
        graphics.drawRect(-16, -16, 32, 32);
        graphics.beginFill(0xffffff, 0.9);
        graphics.drawRect(-6, 0, 12, 16);
        graphics.endFill();
        break;

      case 'city_town':
      case '城镇坊市':
        // 城市图标（放大2倍）
        graphics.beginFill(color, 0.9);
        graphics.drawCircle(0, 0, 20);
        graphics.endFill();
        graphics.lineStyle(2, 0xffffff, 0.8);
        graphics.drawCircle(0, 0, 20);
        // 内圈
        graphics.beginFill(0xffffff, 0.9);
        graphics.drawCircle(0, 0, 8);
        graphics.endFill();
        break;

      case 'blessed_land':
      case '洞天福地':
        // 星形图标（放大2倍）
        graphics.beginFill(color, 0.8);
        graphics.drawCircle(0, 0, 20);
        graphics.endFill();
        graphics.lineStyle(2, 0xffffff, 0.8);
        graphics.drawCircle(0, 0, 20);
        // 星形
        graphics.beginFill(0xffffff, 0.95);
        const points = 5;
        const outerRadius = 12;
        const innerRadius = 6;
        for (let i = 0; i < points * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (Math.PI / points) * i - Math.PI / 2;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (i === 0) {
            graphics.moveTo(x, y);
          } else {
            graphics.lineTo(x, y);
          }
        }
        graphics.closePath();
        graphics.endFill();
        break;

      case 'treasure_land':
      case '奇珍异地':
        // 菱形图标（放大2倍）
        graphics.beginFill(color, 0.9);
        graphics.moveTo(0, -20);
        graphics.lineTo(16, 0);
        graphics.lineTo(0, 20);
        graphics.lineTo(-16, 0);
        graphics.closePath();
        graphics.endFill();
        graphics.lineStyle(2, 0xffffff, 0.8);
        graphics.moveTo(0, -20);
        graphics.lineTo(16, 0);
        graphics.lineTo(0, 20);
        graphics.lineTo(-16, 0);
        graphics.closePath();
        break;

      case 'dangerous_area':
      case '凶险之地':
        // 警告图标（放大2倍）
        graphics.beginFill(color, 0.9);
        graphics.drawCircle(0, 0, 20);
        graphics.endFill();
        graphics.lineStyle(3, 0xffffff, 0.9);
        graphics.drawCircle(0, 0, 20);
        graphics.moveTo(0, -12);
        graphics.lineTo(0, 4);
        graphics.beginFill(0xffffff);
        graphics.drawCircle(0, 10, 3);
        graphics.endFill();
        break;

      case 'special_other':
      case '其他特殊':
        // 闪电图标（放大2倍）
        graphics.beginFill(color, 0.9);
        graphics.moveTo(4, -20);
        graphics.lineTo(-12, 4);
        graphics.lineTo(0, 4);
        graphics.lineTo(-4, 20);
        graphics.lineTo(12, -4);
        graphics.lineTo(0, -4);
        graphics.closePath();
        graphics.endFill();
        graphics.lineStyle(2, 0xffffff, 0.8);
        graphics.moveTo(4, -20);
        graphics.lineTo(-12, 4);
        graphics.lineTo(0, 4);
        graphics.lineTo(-4, 20);
        graphics.lineTo(12, -4);
        graphics.lineTo(0, -4);
        graphics.closePath();
        break;

      default:
        // 默认圆形（放大2倍）
        graphics.beginFill(color, 0.9);
        graphics.drawCircle(0, 0, 16);
        graphics.endFill();
        graphics.lineStyle(2, 0xffffff, 0.8);
        graphics.drawCircle(0, 0, 16);
    }

    return graphics;
  }

  /**
   * 添加势力范围
   */
  addTerritory(location: WorldLocation) {
    if (!location.territoryBounds || location.territoryBounds.length < 3) return;

    const territoryLayer = this.layers.get(3); // MapLayer.TERRITORY
    if (!territoryLayer) return;

    const bounds = location.territoryBounds;

    // 绘制势力范围多边形
    const polygon = new PIXI.Graphics();

    const color = parseInt((location.color || '#6B7280').replace('#', ''), 16);

    // 填充
    polygon.beginFill(color, 0.15);
    polygon.moveTo(bounds[0].x, bounds[0].y);
    for (let i = 1; i < bounds.length; i++) {
      polygon.lineTo(bounds[i].x, bounds[i].y);
    }
    polygon.closePath();
    polygon.endFill();

    // 边框
    polygon.lineStyle(2, color, 0.6);
    polygon.moveTo(bounds[0].x, bounds[0].y);
    for (let i = 1; i < bounds.length; i++) {
      polygon.lineTo(bounds[i].x, bounds[i].y);
    }
    polygon.closePath();

    // 禁用交互，使用手动点击检测
    polygon.eventMode = 'none';

    // 存储用户数据，用于点击检测
    (polygon as any).userData = {
      type: 'location',
      data: {
        id: location.id,
        name: location.name,
        coordinates: location.coordinates || { x: 0, y: 0 },
        location: location,
      },
    };

    // 存储边界数据用于点击检测
    (polygon as any).territoryBounds = bounds;

    territoryLayer.addChild(polygon);

    // 添加势力名称标签（超大透明背景水印，类似大洲）
    const center = this.calculatePolygonCenter(bounds);
    const label = new PIXI.Text(location.name, {
      fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
      fontSize: 100, // 超大字体，像大洲一样
      fill: location.iconColor || '#6B7280',
      fontWeight: 'bold',
      align: 'center',
      stroke: '#ffffff',
      strokeThickness: 6,
    });
    label.anchor.set(0.5);
    label.x = center.x;
    label.y = center.y;
    label.alpha = 0.18; // 非常透明，像背景水印
    label.eventMode = 'none';

    territoryLayer.addChild(label);

    console.log('[地图管理器] 添加势力范围:', location.name);
  }

  /**
   * 更新玩家位置
   */
  /**
   * 更新玩家位置
   */
  clearPlayerMarker() {
    const playerLayer = this.layers.get(5); // MapLayer.PLAYER
    if (!playerLayer) return;
    playerLayer.removeChildren();
  }

  /**
   * 更新NPC位置
   */
  updateNPCPositions(npcs: Array<{ name: string; coordinates: GameCoordinates }>) {
    const playerLayer = this.layers.get(5); // MapLayer.PLAYER (NPC也显示在同一层)
    if (!playerLayer) return;

    // 清除所有旧的NPC标记（保留玩家标记）
    const children = [...playerLayer.children];
    children.forEach((child) => {
      const userData = (child as any).userData;
      if (userData && userData.type === 'npc') {
        playerLayer.removeChild(child);
        try {
          child.destroy({ children: true, texture: false, baseTexture: false });
        } catch {
          // 忽略销毁错误
        }
      }
    });

    // 渲染所有NPC
    npcs.forEach((npc) => {
      if (!Number.isFinite(npc.coordinates?.x) || !Number.isFinite(npc.coordinates?.y)) {
        return;
      }

      const npcContainer = new PIXI.Container();
      npcContainer.x = npc.coordinates.x;
      npcContainer.y = npc.coordinates.y;

      // 标记为NPC
      (npcContainer as any).userData = { type: 'npc', name: npc.name };

      // 绘制NPC光环（紫色系）
      const aura = new PIXI.Graphics();
      aura.beginFill(0x8b5cf6, 0.25);
      aura.drawCircle(0, 0, 35);
      aura.endFill();
      npcContainer.addChild(aura);

      // 绘制NPC标记（圆形头像样式）
      const marker = new PIXI.Graphics();
      marker.beginFill(0x8b5cf6, 0.9);
      marker.drawCircle(0, 0, 22);
      marker.endFill();

      // 边框
      marker.lineStyle(3, 0xffffff, 0.9);
      marker.drawCircle(0, 0, 22);

      // 内部简单人形图标
      marker.lineStyle(0);
      marker.beginFill(0xffffff, 0.95);
      marker.drawCircle(0, -6, 6); // 头部
      marker.endFill();
      marker.beginFill(0xffffff, 0.95);
      marker.moveTo(-8, 4);
      marker.lineTo(8, 4);
      marker.lineTo(8, 14);
      marker.lineTo(-8, 14);
      marker.closePath();
      marker.endFill();

      npcContainer.addChild(marker);

      // 添加NPC名称
      const label = new PIXI.Text(npc.name, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: 40,
        fill: 0x8b5cf6,
        fontWeight: '600',
        align: 'center',
        stroke: '#ffffff',
        strokeThickness: 5,
      });
      label.anchor.set(0.5, 0);
      label.y = 32;
      npcContainer.addChild(label);

      playerLayer.addChild(npcContainer);
    });

    console.log(`[地图管理器] 更新NPC位置: 共${npcs.length}个NPC`);
  }

  updatePlayerPosition(position: GameCoordinates, playerName: string = '玩家') {
    const playerLayer = this.layers.get(5); // MapLayer.PLAYER
    if (!playerLayer) return;
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      this.clearPlayerMarker();
      return;
    }


    // 清除旧的玩家标记
    playerLayer.removeChildren();

    // 创建玩家容器
    const playerContainer = new PIXI.Container();
    playerContainer.x = position.x;
    playerContainer.y = position.y;

    // 绘制光环动画（增大尺寸，增强效果）
    const aura1 = new PIXI.Graphics();
    aura1.beginFill(0xef4444, 0.3);
    aura1.drawCircle(0, 0, 45);
    aura1.endFill();
    playerContainer.addChild(aura1);

    const aura2 = new PIXI.Graphics();
    aura2.beginFill(0xfbbf24, 0.5);
    aura2.drawCircle(0, 0, 28);
    aura2.endFill();
    playerContainer.addChild(aura2);

    // 绘制玩家标记（三角形 - 放大2.5倍）
    const marker = new PIXI.Graphics();
    marker.beginFill(0xdc2626);
    marker.moveTo(0, -30);
    marker.lineTo(-20, 20);
    marker.lineTo(20, 20);
    marker.closePath();
    marker.endFill();

    // 增强边框
    marker.lineStyle(4, 0xfef2f2, 0.95);
    marker.moveTo(0, -30);
    marker.lineTo(-20, 20);
    marker.lineTo(20, 20);
    marker.closePath();

    // 中心点（增大）
    marker.beginFill(0xfef2f2);
    marker.drawCircle(0, 0, 8);
    marker.endFill();
    marker.beginFill(0xdc2626);
    marker.drawCircle(0, 0, 4);
    marker.endFill();

    playerContainer.addChild(marker);

    // 添加玩家名称（增大字体）
    const label = new PIXI.Text(playerName, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: 48, // 增大玩家名称字体
      fill: 0xdc2626,
      fontWeight: '700',
      align: 'center',
      stroke: '#ffffff',
      strokeThickness: 6,
    });
    label.anchor.set(0.5, 0);
    label.y = 40; // 调整位置
    playerContainer.addChild(label);

    playerLayer.addChild(playerContainer);

    console.log('[地图管理器] 更新玩家位置:', position);
  }

  /**
   * 居中到指定坐标
   */
  centerTo(x: number, y: number, animate: boolean = true) {
    const targetX = this.app.screen.width / 2 - x * this.worldContainer.scale.x;
    const targetY = this.app.screen.height / 2 - y * this.worldContainer.scale.y;

    if (animate) {
      // 简单的动画实现
      const startX = this.worldContainer.x;
      const startY = this.worldContainer.y;
      const duration = 500; // 毫秒
      const startTime = Date.now();

      const animateStep = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用 easeInOutQuad 缓动函数
        const easeProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        this.worldContainer.x = startX + (targetX - startX) * easeProgress;
        this.worldContainer.y = startY + (targetY - startY) * easeProgress;

        if (progress < 1) {
          requestAnimationFrame(animateStep);
        }
      };

      requestAnimationFrame(animateStep);
    } else {
      this.worldContainer.x = targetX;
      this.worldContainer.y = targetY;
    }
  }

  /**
   * 获取视口状态
   */
  getViewportState(): ViewportState {
    // 计算中心点在世界坐标系中的位置
    const centerX = (this.app.screen.width / 2 - this.worldContainer.x) / this.worldContainer.scale.x;
    const centerY = (this.app.screen.height / 2 - this.worldContainer.y) / this.worldContainer.scale.y;

    return {
      x: centerX,
      y: centerY,
      scale: this.worldContainer.scale.x,
      screenWidth: this.app.screen.width,
      screenHeight: this.app.screen.height,
    };
  }

  /**
   * 设置缩放级别
   */
  setZoom(scale: number, animate: boolean = true) {
    // 限制缩放范围
    const minScale = this.config.minZoom || 0.1;
    const maxScale = this.config.maxZoom || 4;
    const clampedScale = Math.max(minScale, Math.min(maxScale, scale));

    // 获取当前中心点在世界坐标系中的位置
    const centerX = (this.app.screen.width / 2 - this.worldContainer.x) / this.worldContainer.scale.x;
    const centerY = (this.app.screen.height / 2 - this.worldContainer.y) / this.worldContainer.scale.y;

    if (animate) {
      // 简单的缩放动画
      const startScale = this.worldContainer.scale.x;
      const duration = 300; // 毫秒
      const startTime = Date.now();

      const animateStep = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用 easeInOutQuad 缓动函数
        const easeProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const currentScale = startScale + (clampedScale - startScale) * easeProgress;
        this.worldContainer.scale.set(currentScale);

        // 调整位置，保持中心点不变
        this.worldContainer.x = this.app.screen.width / 2 - centerX * currentScale;
        this.worldContainer.y = this.app.screen.height / 2 - centerY * currentScale;

        if (progress < 1) {
          requestAnimationFrame(animateStep);
        }
      };

      requestAnimationFrame(animateStep);
    } else {
      this.worldContainer.scale.set(clampedScale);
      // 调整位置，保持中心点不变
      this.worldContainer.x = this.app.screen.width / 2 - centerX * clampedScale;
      this.worldContainer.y = this.app.screen.height / 2 - centerY * clampedScale;
    }
  }

  /**
   * 计算多边形中心点
   */
  private calculatePolygonCenter(points: { x: number; y: number }[]): { x: number; y: number } {
    if (points.length === 0) return { x: 0, y: 0 };

    const sumX = points.reduce((sum, point) => sum + point.x, 0);
    const sumY = points.reduce((sum, point) => sum + point.y, 0);

    return {
      x: sumX / points.length,
      y: sumY / points.length,
    };
  }

  /**
   * 判断点是否在多边形内（射线法）
   */
  private isPointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * 计算多边形面积（Shoelace公式）
   */
  private calculatePolygonArea(polygon: { x: number; y: number }[]): number {
    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      area += polygon[i].x * polygon[j].y;
      area -= polygon[j].x * polygon[i].y;
    }
    return Math.abs(area / 2);
  }

  /**
   * 事件监听
   */
  on(event: string, callback: (data?: unknown) => void) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  /**
   * 触发事件
   */
  private emit(event: string, data?: unknown) {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  /**
   * 清空地图
   */
  clear() {
    // 由于已禁用事件系统，直接清理即可
    this.layers.forEach((layer) => {
      const children = [...layer.children];
      layer.removeChildren();

      children.forEach((child) => {
        try {
          child.destroy({ children: true, texture: false, baseTexture: false });
        } catch {
          // 忽略销毁错误
        }
      });
    });

    this.locationSprites.clear();
    this.continentBounds.clear();
    this.drawBackground();

    console.log('[地图管理器] 地图已清空');
  }

  /**
   * 调整大小
   */
  resize(width: number, height: number) {
    this.app.renderer.resize(width, height);
    console.log('[地图管理器] 调整大小:', `${width}x${height}`);
  }

  /**
   * 销毁
   */
  destroy() {
    // 1. 移除 canvas 事件监听器
    const canvas = this.app.view as HTMLCanvasElement;
    canvas.removeEventListener('mousedown', this.boundOnDragStart);
    canvas.removeEventListener('mousemove', this.boundOnDragMove);
    canvas.removeEventListener('mouseup', this.boundOnDragEnd);
    canvas.removeEventListener('mouseleave', this.boundOnDragEnd);
    canvas.removeEventListener('touchstart', this.boundOnTouchStart);
    canvas.removeEventListener('touchmove', this.boundOnTouchMove);
    canvas.removeEventListener('touchend', this.boundOnTouchEnd);
    canvas.removeEventListener('wheel', this.boundOnWheel);

    // 2. 停止渲染循环
    this.app.ticker.stop();

    // 3. 销毁容器和应用（事件系统已在构造函数中禁用）
    try {
      this.worldContainer.destroy({ children: true });
    } catch {
      // 忽略销毁错误
    }

    try {
      this.app.destroy(true, { children: true, texture: true, baseTexture: true });
    } catch {
      // 忽略销毁错误
    }

    // 4. 清理引用
    this.layers.clear();
    this.locationSprites.clear();
    this.eventCallbacks.clear();
    this.continentBounds.clear();

    console.log('[地图管理器] 已销毁');
  }
}
