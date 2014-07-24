/**
 * An html5 canvas based 3-dimensional dungeon mapper using geomorphs.
 * Author: Jeff Schecter (jeffrey.schecter@gmail.com)
 */

// Constants & arbitrary stringy trash go here.
var geo = {
  map: null,
  TILE_SIZE: 300,
  LOADING: "#loading",
  PATH_OVERHEAD: "static/tilesets/overhead/",
  PATH_VERTICAL: "static/tilesets/vertical/",
  LEFT: "L",
  RIGHT: "R",
  TOP: "T",
  OVERHEAD: "overhead",
  VERTICAL: "vertical",

  PSEUDOFORMS: {
    CURSOR: "rgba(0, 0, 255, 0.2)",
    CURSOR_LIGHT: "rgba(0, 0, 255, 0.1)",
  },

  CURSOR: "CURSOR",
  CURSOR_LIGHT: "CURSOR_LIGHT",
  HIGHLIGHT: "HIGHLIGHT",

  KEYS: {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    D: 68,
    F: 70,
    R: 82,
    ZERO: 48
  }
};


/* ------------------------------------------------------------------------- *
 * A Mapper contains Tilesets and draws maps on a context.
 * ------------------------------------------------------------------------- */
geo.Mapper = function(canvas, palette) {
  this.canvas = canvas;
  this.canvas.width = this.canvas.offsetWidth;
  this.canvas.height = this.canvas.offsetHeight;
  this.cx = this.canvas.getContext("2d");
  this.palette = palette;
  this.zoom = 0.5;
  this.originX = this.canvas.width / 2 - geo.TILE_SIZE;
  this.originY = this.canvas.height / 2;
  this.scrollX = 0;
  this.scrollY = 0;
  this.cursor = [geo.RIGHT, 0, 0, 0];
  this.tilesets = {};
  this.tiles = {};

  // At this point the only thing that'll render is a blueish square.
  this.render();
};

geo.Mapper.prototype.loadTileset = function(setname, overhead, vertical) {
  if (!this.tilesets[setname]) {
    this.tilesets[setname] = new geo.Tileset(
      this, setname, overhead, vertical);
  }
};

geo.Mapper.prototype.addTilesetToPalette = function(setname) {
  var i,
    tileset = this.tilesets[setname],
    forms = tileset.vertical.forms.concat(tileset.overhead.forms);
  for (i = 0; i < forms.length; i++) {
    this.palette.appendChild(forms[i].img);
  }
};

geo.Mapper.prototype.addTile = function(form, opt_coords) {
  var coords = opt_coords || this.cursor,
    tile = [form.parent.name, form.subset, form.offset],
    oldTile = this.tiles[coords];
  if (oldTile && oldTile.toString() == tile.toString()) {
    delete this.tiles[coords];
  } else {
    // Remember, making something an object key coerces it to a string.
    // Keys of Mapper.tiles will therefore be strings like "L,0,0,0" rather
    // than arrays like ["L", 0, 0, 0].
    this.tiles[coords] = [form.parent.name, form.subset, form.offset];
  }
};

geo.Mapper.prototype.resetCanvas = function() {
  this.canvas.width = this.canvas.width;
  this.cx = this.canvas.getContext("2d");
};

geo.Mapper.prototype.drawForm = function(form, role, x, y, z) {
  this.cx.setTransform(this.zoom, 0, 0, this.zoom,
    this.originX + this.scrollX, this.originY + this.scrollY);
  switch (role) {
    case geo.LEFT:
      this.cx.transform(
        1, 0.5, 0, 1,
        geo.TILE_SIZE * (x - y),
        geo.TILE_SIZE * (z - y / 2 - x / 2) * -1);
      break;
    case geo.RIGHT:
      this.cx.transform(
        1, -0.5, 0, 1,
        geo.TILE_SIZE * (x - y + 1),
        geo.TILE_SIZE * (((z - y / 2 - x / 2) * -1) + 0.5));
      break;
    case geo.TOP:
      this.cx.scale(2 / Math.sqrt(2), 1 / Math.sqrt(2));
      this.cx.rotate(Math.PI / 4);
      this.cx.translate(
        geo.TILE_SIZE * (x - z),
        geo.TILE_SIZE * (y - z - 1));
      break;
  }
  if (form instanceof geo.Form) {
      this.cx.drawImage(form.img, 0, 0);
  } else {
      this.cx.fillStyle = geo.PSEUDOFORMS[form];
      this.cx.fillRect(0, 0, geo.TILE_SIZE, geo.TILE_SIZE);
  }
};

geo.Mapper.prototype.drawCursor = function() {
  var role = this.cursor[0],
    x = this.cursor[1],
    y = this.cursor[2],
    z = this.cursor[3];
  this.drawForm(
    role == geo.LEFT ? geo.CURSOR : geo.CURSOR_LIGHT,
    geo.LEFT, x, y, z);
  this.drawForm(
    role == geo.RIGHT ? geo.CURSOR : geo.CURSOR_LIGHT,
    geo.RIGHT, x, y, z);
  this.drawForm(
    role == geo.TOP ? geo.CURSOR : geo.CURSOR_LIGHT,
    geo.TOP, x, y, z);
};

geo.Mapper.prototype.render = function() {
  // TODO: Ensure all used tilesets are loaded before drawing.
  var coord, tile;
  this.resetCanvas();
  for (coord in this.tiles) {
    tile = this.tiles[coord];
    // Turn the key string back into an array of [role, x, y, z].
    // At this point x, y, and z are still strings, not ints. Failing to
    // coerce them back to ints before drawing will cause Very Strange Bugs,
    // because "1" - "2" = -1 but "1" + "2" = "12". Fuck you, javascript.
    coord = coord.split(",");
    this.drawForm(
      this.tilesets[tile[0]][tile[1]].forms[tile[2]],
      coord[0], parseInt(coord[1]), parseInt(coord[2]), parseInt(coord[3]));
  }
  this.drawCursor();
};

geo.Mapper.prototype.curse = function(role, x, y, z) {
  this.cursor = [role, x, y, z];
  this.render();
};

geo.Mapper.prototype.handleKey = function(keyCode) {
  var c = this.cursor,
    r = c[0],
    x = c[1],
    y = c[2],
    z = c[3];
  switch (keyCode) {
    // LEFT, UP, and RIGHT curse the proper cube face if it isn't already
    // highlighted. If it is highlighted, they move the cursor one unit
    // in that direction.
    case geo.KEYS.LEFT:
      if (r == geo.LEFT) this.curse(r, x, y + 1, z);
      if (r != geo.LEFT) this.curse(geo.LEFT, x, y, z);
      break;
    case geo.KEYS.UP:
      if (r == geo.TOP) this.curse(r, x, y, z + 1);
      if (r != geo.TOP) this.curse(geo.TOP, x, y, z);
      break;
    case geo.KEYS.RIGHT:
      if (r == geo.RIGHT) this.curse(r, x + 1, y, z);
      if (r != geo.RIGHT) this.curse(geo.RIGHT, x, y, z);
      break;
    // DOWN is a little weird: it moves the cursor one unit in the direction
    // opposite the highlighted cube face.
    case geo.KEYS.DOWN:
      if (r == geo.LEFT) this.curse(r, x, y - 1, z);
      if (r == geo.TOP) this.curse(r, x, y, z - 1);
      if (r == geo.RIGHT) this.curse(r, x - 1, y, z);
      break;
    // Return to the origin.
    case geo.KEYS.ZERO:
      this.curse(geo.RIGHT, 0, 0, 0);
      break;
    // Delete cursed tile.
    case geo.KEYS.D:
      delete this.tiles[this.cursor];
      this.render();
    // Transform the cursed tile: F is flip, R is rotate.
    case geo.KEYS.F:
      console.log("flip");
      break;
    case geo.KEYS.R:
      console.log("rotate");
      break;
    default:
      console.log(keyCode);
  }
};


/* ------------------------------------------------------------------------- *
 * A Tileset contains overhead and vertical Forms, which the parent mapper
 * instantiates as tiles in its drawing context.
 * ------------------------------------------------------------------------- */
geo.Tileset = function(parent, setname, overhead, vertical) {
  this.parent = parent;
  this.name = setname;
  this.overhead = {img: new Image(), loaded: 0, forms: [], set: overhead};
  this.vertical = {img: new Image(), loaded: 0, forms: [], set: vertical};
  if (overhead) this.loadTiles(geo.PATH_OVERHEAD, geo.OVERHEAD);
  if (vertical) this.loadTiles(geo.PATH_VERTICAL, geo.VERTICAL);
};

geo.Tileset.prototype.loadTiles = function(path, subset) {
  var i,
    self = this,
    tileSubset = this[subset];
  tileSubset.img.onload = function() {
    for (i = 0; i < tileSubset.img.width / geo.TILE_SIZE; i++) {
      tileSubset.forms.push(new geo.Form(self, subset, i));
    }
  };
  tileSubset.img.src = path + this.name + ".png";
};

geo.Tileset.prototype.isLoaded = function() {
  return (
    (!this.overhead.set || this.overhead.forms.length > 0) &&
    (!this.vertical.set || this.vertical.forms.length > 0) &&
    this.overhead.forms.length == this.overhead.loaded &&
    this.vertical.forms.length == this.vertical.loaded)
};

geo.Tileset.prototype.install = function() {
  this.parent.addTilesetToPalette(this.name);
  // Yuck. I really don't like tying data model classes to DOM objects
  // defined in the HTML. At least this'll just noop in the absence of
  // proper DOM.
  document.querySelector(geo.LOADING).style.display = "none";
};


/* ------------------------------------------------------------------------- *
 * A Form contains an canvas with a picture of a dungeon tile, as well as
 * an image used to display the tile in the UI & copy the tile to the
 * mapper's canvas.
 * ------------------------------------------------------------------------- */
geo.Form = function(parent, subset, offset) {
  var self = this;
  this.parent = parent;
  this.subset = subset;
  this.offset = offset;
  this.canvas = document.createElement("canvas");
  this.canvas.width = geo.TILE_SIZE;
  this.canvas.height = geo.TILE_SIZE;
  this.cx = this.canvas.getContext("2d");
  this.cx.drawImage(
    this.parent[this.subset].img, offset * geo.TILE_SIZE, 0,
    geo.TILE_SIZE, geo.TILE_SIZE, 0, 0, geo.TILE_SIZE, geo.TILE_SIZE);

  // UI element
  this.img = new Image();
  this.img.onload = function() {
    self.parent[self.subset].loaded++;
    if (self.parent.isLoaded()) self.parent.install();
  };
  this.img.onclick = function() {
    self.parent.parent.addTile(self)
    self.parent.parent.render();
  };
  this.img.src = this.canvas.toDataURL();
};
