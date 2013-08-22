// GAME SCENE 1
// ------------------

/////// NEED TO DO :
// need to make it so that when the minotaur kills you, the timer also resets...



Crafty.scene('Game_scene_1', function() {
  Crafty.background("url('assets/ground_tile.gif')");
  this.occupied = new Array(Game.map_grid.width);
  for (var i = 0; i < Game.map_grid.width; i++) {
    this.occupied[i] = new Array(Game.map_grid.height);
    for (var y = 0; y < Game.map_grid.height; y++) {
      this.occupied[i][y] = false;
    }
  }

  var new_game = true;

 
  // Player character, placed at 6, 1 on our grid
  this.player = Crafty.e('Bubsy').at(6, 1);
  this.occupied[this.player.at().x][this.player.at().y] = true;

  this.player.bind('EnterFrame', function() {
    if(this.x > 1640)
      Crafty.viewport.scroll('_x', -1140);
    else if(this.x > 500)
      Crafty.viewport.scroll('_x', -this.x + 500);
    else 
      Crafty.viewport.scroll('_x', 0);

    if(this.y > 1975)
      Crafty.viewport.scroll('_y', -1700);
    else if(this.y > 300)
      Crafty.viewport.scroll('_y', -this.y + 300);
    else
      Crafty.viewport.scroll('_y', 0);
  });  

  this.enemy = Crafty.e('Minotaur').at(9, 4); 
  this.occupied[this.enemy.at().x][this.enemy.at().y] = true;

  this.enemy = Crafty.e('Minotaur').at(9, 17); 
  this.occupied[this.enemy.at().x][this.enemy.at().y] = true;

  this.enemy = Crafty.e('Minotaur').at(31, 22); 
  this.occupied[this.enemy.at().x][this.enemy.at().y] = true;

  if (new_game) {
    var time = 0;
    function countTime() {
      var html = "<p>" + time + "</p>";
      var target = document.getElementById("timer");
      target.innerHTML = html;
      time++;
    }
    var counter = setInterval(countTime, 1000);

    function log_time() {
      return time;
    }
  }

  
 
  // Places the maze walls
  for (var x = 0; x < Game.map_grid.width; x++) {
    for (var y = 0; y < Game.map_grid.height; y++) {
      var top = ((x != 0) && (x < Game.map_grid.width - 1)) && (y == 0);
      var bottom = ((x != 0) && (x < Game.map_grid.width - 1)) && (y == Game.map_grid.height - 1);
      var tleft_corner = (x == 0 && y == 0);
      var bleft_corner = ((x == 0) && (y == Game.map_grid.height - 1));
      var tright_corner = (x == Game.map_grid.width - 1 && y == 0);
      var bright_corner = (x == Game.map_grid.width - 1  && y == Game.map_grid.height - 1);
      if((x == 0) && ((y != 0) && (y != Game.map_grid.height - 1))) {
        Crafty.e('Maze_Left').at(x, y);
        this.occupied[x][y] = true;
      }
      else if ((x == Game.map_grid.width - 1) && ((y != 0) && (y != Game.map_grid.height - 1))) {
        Crafty.e('Maze_Right').at(x, y);
        this.occupied[x][y] = true;
      }
      else if (top) {
        Crafty.e('Maze_Top').at(x, y);
        this.occupied[x][y] = true;
      }
      else if (bottom) {
        Crafty.e('Maze_Bottom').at(x, y);
        this.occupied[x][y] = true;
      }
      else if (tleft_corner) {
        Crafty.e('Maze_TLeft').at(x, y);
        this.occupied[x][y] = true;
      }
      else if (bleft_corner) {
        Crafty.e('Maze_BLeft').at(x, y);
        this.occupied[x][y] = true;
      }
      else if (tright_corner) {
        Crafty.e('Maze_TRight').at(x, y);
        this.occupied[x][y] = true;
      }
      else if (bright_corner) {
        Crafty.e('Maze_BRight').at(x, y);
        this.occupied[x][y] = true;
      }
    }
  }


  var map_data = [
    "                                       ",
    "       #         # #          #        ",
    "  ###### ##### # #   ######## # ###### ",
    "       #     # # # # #        #      # ",
    " ##### # M # # #   # # ############# # ",
    "     # #   # # ##### # #           # # ",
    "  #    # # # #     # # # ######### # # ",
    "  ###### # ####### # # # #   #   # # # ",
    "         #         # # # # #   #   # # ",
    " #### ########## ### # # # ######### # ",
    "        #        #   # # #           # ",
    "  ####### ######## ### # ############# ",
    "  #       #      # #   # #             ",
    "  # ####### #### # # # # # ############",
    "  # #          # ### # # #             ",
    "  # # ######## # # # # # ############# ",
    "  # # #      # # # # # # # #         # ",
    "  # # #  M # # # # # # # # # ####### # ",
    "  # # #    # # # # # # # # # #     # # ",
    "  # # ###### # # # # # # # # #   # # # ",
    "  # #        # # # # # # # # #   # # # ",
    "  # ########## # # # # # # # #   # # # ",
    "  #            #   # # ### # # M # # # ",
    "  ################## #   # # #   # # # ",
    "                     ### # # #   # # # ",
    " ######## ########## #   # # #   # # # ",
    "        # #            ### # #   # # # ",
    "  ##### # # ############   # ##### # # ",
    "  #     # ###            # #       # # ",
    "  # #####     ############ ######### # ",
    "  #     # #####                      # ",
    "  ##### # #   ######################## ",
    "  #     # # #                          ",
    "  ##### # ############################ ",
    "  #   #   #                            ",
    "  # # # # # ###########################",
    "  # # # # #                            ",
    "  # # # # ############################ ",
    "    #   #                              "
];

for (var y = 1; y < map_data.length; y++) {
    for (var x = 1; x < map_data[y].length; x++) {
        if (map_data[y][x] === "#") {
            Crafty.e('Maze_Up').at(x, y);
            this.occupied[x][y] = true;
        }
    }
}
 
  var max_treats = 100;
  for (var x = 0; x < Game.map_grid.width; x++) {
    for (var y = 0; y < Game.map_grid.height; y++) {
      var new_sweet = Math.floor((Math.random() * 16) + 1);
      var chance = Math.random();
      if (chance < 0.1) {
        if (Crafty('Treat').length < max_treats && !this.occupied[x][y]) {
          Crafty.e([
            'Mushmousse', 'Pinkpie', 'Tailpie', 'Mushcake',
            'Lolli', 'Candy', 'House', 'Ice',
            'Cherry', 'Heartmousse', 'Chocheart', 'Pinkmousse',
            'Chocpie', 'Mango', 'Strawpie', 'Cookie'
        ][Math.floor(Math.random() * 16)]).at(x, y);
        }
      }
    }
  }

  this.show_victory = this.bind('TreatObtained', function() {
      if (!Crafty('Treat').length) {
      new_game = false;
      console.log(log_time());
      clearInterval(counter);
      Crafty.scene('Victory');
      };
  });

  this.show_died = this.bind('Kill', function() {
      new_game = false;
      console.log(log_time());
      clearInterval(counter);
      Crafty.scene('Dead');
  });

  Crafty.audio.play("start");
}, 

function() {
  this.unbind('Kill', this.show_died);
},

function() {
  this.unbind('TreatObtained', this.show_victory);
});



// Loading scene
// -------------
// Handles the loading of binary assets such as images and audio files
// declares a variable called "Loading" and applies the following functions to it...
Crafty.scene('Loading', function(){
  // Draw some text for the player to see in case the file
  //  takes a noticeable amount of time to load
  Crafty.e('2D, DOM, Text')
    .text('Loading please wait...')
    // the x placer doesn't need to be set because we set the $text_css variable to automatically
    // put the text in the center of it's given area.
    // the height starts the text at the bottom of the game screen, then subtracts 24 pixels
    // the w placer makes the text take up the width of the game screen x axis
    .attr({ x: 0, y: Game.height()/2 - 24, w: Game.width() })
    .css($text_css);
 
  // Load our sprite map image and sounds from the assets folder
  Crafty.load(['assets/bubsy_sprites.gif',
                'assets/treats_white.gif',
                'assets/bubsy_sprites_close.gif',
                'assets/background_tiles_1.gif',
                'assets/mino_close.gif',
                'assets/eat.mp3',
                'assets/breezy.mp3',
                'assets/x_got.mp3',
                'assets/mino_updated.gif',
                'assets/exploder.mp3'], function(){
    // Once the image is loaded...
 
    // Define the individual sprites in the image
    // Each one (spr_tree, etc.) becomes a component
    // These components' names are prefixed with "spr_"
    //  to remind us that they simply cause the entity
    //  to be drawn with a certain sprite
    // the 16 in the parameter means that each sprite is 16 pixels high/wide
    Crafty.sprite(57, 'assets/background_tiles_1.gif', {
      spr_maze_bottom:    [0, 0],
      spr_maze_right:     [0, 1],
      spr_maze_trc:       [0, 2],
      spr_maze_left:      [1, 0],
      spr_floor:          [1, 1],
      spr_maze_tlc:       [1, 2],
      spr_maze_up:        [2, 0],
      spr_maze_brc:       [2, 1],
      spr_maze_blc:       [2, 2],
      spr_maze_top:       [3, 0]
    });

    Crafty.sprite(47, 'assets/4747.gif', {
      spr_bubsy_stand:   [0, 2]
    });

    Crafty.sprite(47, 'assets/mino_updated.gif', {
      spr_minotaur:   [0, 0]
    });

    Crafty.sprite(40, 'assets/treats_white.gif', {
      spr_mushmousse:    [0, 0],
      spr_pinkpie:       [1, 0],
      spr_tailpie:       [2, 0],
      spr_mushcake:      [3, 0],
      spr_lolli:         [4, 0],
      spr_candy:         [5, 0],
      spr_house:         [0, 1],
      spr_ice:           [1, 2],
      spr_cherry:        [2, 1],
      spr_fruit:         [3, 4],
      spr_heartmousse:   [4, 1],
      spr_chocheart:     [5, 1],
      spr_pinkmousse:    [1, 2],
      spr_chocpie:       [2, 2],
      spr_mango:         [3, 2],
      spr_strawpie:      [4, 2],
      spr_cookie:        [5, 2]
    }, 4);


     // Define our sounds for later use
    Crafty.audio.add({
      eat:      ['assets/eat.mp3'], 
      kill:     ['assets/exploder.mp3'], 
      win:      ['assets/x_got.mp3'],
      start:    ['assets/sphere.mp3'],
      // theme:    ['assets/breezy.mp3']  ///////////////ENABLE MUSIC
    });


    // Crafty.audio.play("theme", -1);  ///////////////ENABLE MUSIC
 
    // Now that our sprites are ready to draw, start the game
    Crafty.scene('Game_scene_1');
  })
});


// Victory Scene
// -----------------
// Tells the player that they've won and lets them start a new game

// declares the Victory screen variable
  Crafty.scene('Victory', function() {
    Crafty.e('2D, DOM, Text, Background')
      // this places the text victory message at the 0,0 coordinate on the stage
      .attr({x: 300, y: 275, w: 500})
      .text('You got all the treats!').css($text_css);
      // in " + time + " seconds!";
      Crafty.background('black');
      Crafty.audio.play("win"); 

  // After a short delay, watch for the player to press a key, then restart
  // the game when a key is pressed
  var delay = true;
  setTimeout(function() { 
    delay = false;
    if (!delay) {
      Crafty.scene('Press');
    }
  }, 3000);
});



// Press Any Button Scene
// -----------------

  Crafty.scene('Press', function() {
    Crafty.e('2D, DOM, Text')
      // this places the text victory message at the 0,0 coordinate on the stage
      .attr({x: 300, y: 275, w: 500})
      .text('Press any key to play again').css($text_css);
      Crafty.background('black');

  // declares an event called 'restart_game' and binds the KeyDown variable globally and declares a function
  // to bring the game scene back up

  // "Watch for the player to press a key, then restart the game
  // when a key is pressed"
  this.restart_game = this.bind('KeyDown', function() {
    Crafty.scene('Game_scene_1');
  });
}, 

// Remove our event binding from above so that we don't
// end up having multiple redundant event watchers after
// multiple restarts of the game
function() {
  this.unbind('KeyDown', this.restart_game);
});


// Player Died Scene
// -----------------
// Tells the player that they've won and lets them start a new game

// declares the Victory screen variable
  Crafty.scene('Dead', function() {
    Crafty.e('2D, DOM, Text, Background')
      // this places the text victory message at the 0,0 coordinate on the stage
      .attr({x: 300, y: 275, w: 500})
      .text('The minotaur punched you and took all your treats!').css($text_css);
    Crafty.background('black');



    // console.log(log_time());
    // clearInterval(counter);

  // After a short delay, watch for the player to press a key, then restart
  // the game when a key is pressed
  var delay = true;
  setTimeout(function() { 
    delay = false;
    if (!delay) {
      Crafty.scene('Again');
    }
  }, 3000);
});

// Press Any Button Scene
// -----------------

  Crafty.scene('Again', function() {
    Crafty.e('2D, DOM, Text')
      // this places the text victory message at the 0,0 coordinate on the stage
      .attr({x: 300, y: 275, w: 500})
      .text('Push any key to try again!').css($text_css);
      Crafty.background('black');

  // declares an event called 'restart_game' and binds the KeyDown variable globally and declares a function
  // to bring the game scene back up

  // "Watch for the player to press a key, then restart the game
  // when a key is pressed"
  this.again_game = this.bind('KeyDown', function() {
    Crafty.scene('Game_scene_1');
  });
}, 

// Remove our event binding from above so that we don't
// end up having multiple redundant event watchers after
// multiple restarts of the game
function() {
  this.unbind('KeyDown', this.again_game);
});
