window.addEventListener("keydown", function(e) {
    // space and arrow keys
    if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);



Game = {
	map_grid: {
    width:  40,
    height: 40,
    tile: {
      width:  57,
      height: 57
    }
  },



  // The total width of the game screen. Since our grid takes up the entire screen
  //  this is just the width of a tile times the width of the grid
  width: function() {
    return this.map_grid.width * this.map_grid.tile.width;
  },
 
  // The total height of the game screen. Since our grid takes up the entire screen
  //  this is just the height of a tile times the height of the grid
  height: function() {
    return this.map_grid.height * this.map_grid.tile.height;
  },

  // Initialize and start our game
  start: function() {
    // Crafty.init(2280, 2280);
    Crafty.init(1140, 570);

    Crafty.load(['assets/ground_tile.gif'], function(){
          Crafty.background('spr_floor');  
    });     
 
    // Simply start the "Loading" scene to get things going
    Crafty.scene('Loading');
  }
}

$text_css = {
  'font-size': '24px',
  'font-family': 'Arial',
  'color': 'white',
  'text-align': 'center'
}
