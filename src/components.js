// The Grid component allows an element to be located
//  on a grid of tiles
Crafty.c('Grid', {
  init: function() {
    this.attr({
      w: Game.map_grid.tile.width,
      h: Game.map_grid.tile.height
    })
  },
 
  // Locate this entity at the given position on the grid
  at: function(x, y) {
    if (x === undefined && y === undefined) {
      return { x: this.x/Game.map_grid.tile.width, y: this.y/Game.map_grid.tile.height }
    } 
    else {
      this.attr({ x: x * Game.map_grid.tile.width, y: y * Game.map_grid.tile.height });
      return this;
    }
  }
});

Crafty.c('Actor', {
  init: function() {
    this.requires('2D, Canvas, Grid');
  },
});

// Crafty.c('Finish', {
//   init: function() {
//     this.requires('Actor, Color')
//     this.color('orange');
//   },
// });

Crafty.c('Maze_Up', {
  init: function() {
    this.requires('Actor, Solid, spr_maze_up');
  },
});

Crafty.c('Maze_Left', {
  init: function() {
    this.requires('Actor, Solid, spr_maze_left');
  },
});

Crafty.c('Maze_Right', {
  init: function() {
    this.requires('Actor, Solid, spr_maze_right');
  },
});

Crafty.c('Maze_Top', {
  init: function() {
    this.requires('Actor, Solid, spr_maze_top');
  },
});

Crafty.c('Maze_Bottom', {
  init: function() {
    this.requires('Actor, Solid, spr_maze_bottom');
  },
});

Crafty.c('Maze_BRight', {
  init: function() {
    this.requires('Actor, Solid, spr_maze_brc');
  },
});

Crafty.c('Maze_TRight', {
  init: function() {
    this.requires('Actor, Solid, spr_maze_trc');
  },
});

Crafty.c('Maze_TLeft', {
  init: function() {
    this.requires('Actor, Solid, spr_maze_tlc');
  },
});

Crafty.c('Maze_BLeft', {
  init: function() {
    this.requires('Actor, Solid, spr_maze_blc');
  },
});

Crafty.c('Minotaur', {
  init: function() {
    // this.requires('Actor, Fourway, Solid, spr_minotaur, SpriteAnimation')
    this.requires('Actor, Fourway, Collision, spr_minotaur, SpriteAnimation')
    .attr({ x: 300, y: 150,
      dX: 2, 
      dY: 2 })
    .bind('EnterFrame', function() {
      var animation_speed = 30;

      if ((this.x <= 457 || this.x >= 580) && (this.y <= 250 && this.y >= 200)) {
        // var previous_x = 
        this.dX *= -1;
        if(this.x >= 580) {
          this.stop();
          this.animate('MinoLeft', animation_speed, -1);
        }
        if(this.x <= 457){
          this.stop();
          this.animate('MinoRight', animation_speed, -1);
        }
      }
      if ((this.x <= 400 || this.x >= 580) && (this.y >= 930 && this.y <= 980)) {
        // var previous_x = 
        this.dX *= -1;
        if(this.x >= 580) {
          this.stop();
          this.animate('MinoLeft', animation_speed, -1);
        }
        if(this.x <= 400){
          this.stop();
          this.animate('MinoRight', animation_speed, -1);
        }
      }
      if ((this.x <= 1710 || this.x >= 1835) && (this.y >= 1250 && this.y <= 1300)) {
        // var previous_x = 
        this.dX *= -1;
        this.dY *= -1;
        this.y += this.dY;
        if(this.x >= 1835) {
          this.stop();
          // this.x += this.dX;
          this.y -= this.dY;
          this.animate('MinoLeft', animation_speed, -1);
        }
        if(this.x <= 1710){
          this.stop();
          // this.x += this.dX;
          this.y -= this.dY;
          this.animate('MinoRight', animation_speed, -1);
        }
      }
      this.x += this.dX;
  })
    .animate('MinoRight', 0, 0, 3)
    .animate('MinoLeft', 0, 1, 3);
  }
});

Crafty.c('Bubsy', {
  init: function() {
    this.requires('Actor, Fourway, Collision, spr_bubsy_stand, SpriteAnimation')
    .fourway(7)
    .stopOnSolids()
    .onHit('Treat', this.TreatObtained)
    .onHit('Minotaur', this.Kill)
    .animate('PlayerMovingRight', 0, 0, 5)
    .animate('PlayerMovingLeft',  0, 1, 5)
    .animate('PlayerMovingDown',  0, 3, 1)
    .animate('PlayerMovingUp',  0, 4, 1)
    .animate('PlayerStill',  0, 2, 4);

    var alive = true;

    // Watch for a change of direction and switch animations accordingly
    var animation_speed = 18;
    this.bind('NewDirection', function(data) {
      // this is declaring a new variable "NewDirection" and is checking which way they moved
      // if the x axis records that the player moved an additional space (or pixel) to the right,
      // it declares the variable "PlayerMovingRight" and inserts the speed variable declared on line 82
      if (data.x > 0) {
        this.stop();
        animation_speed = 20;
        this.animate('PlayerMovingRight', animation_speed, -1);
      } 
      else if (data.x < 0) {
        this.stop();
        animation_speed = 20;
        this.animate('PlayerMovingLeft', animation_speed, -1);
      }
      else if (data.y > 0) {
        this.stop();
        animation_speed = 20;
        this.animate('PlayerMovingDown', animation_speed, -1);
      }
      else if (data.y < 0) {
        this.stop();
        animation_speed = 20;
        this.animate('PlayerMovingUp', animation_speed, -1);
      }
      else {
        this.stop();
        animation_speed = 140;
        this.animate('PlayerStill', animation_speed, -1);
      }
    });
  },

  // Registers a stop-movement function to be called when
  // this entity hits an entity with the "Solid" component

  // this is saying whenever this function is being used with an entity that collides with 
  // a solid component, it will stop that entities movement (function being created on line 128).
  stopOnSolids: function() {
    this.onHit('Solid', this.stopMovement);
 
    return this;
  },

  // onFinish: function() {
  //   this.onHit('Finish', console.log("on finish"));
  // },
 
  // Stops the movement
  // the -= this._movement makes it so the character stops moving on contact.. If you change it
  // to +=, it will make the character go THROUGH that object at a faster walking rate.
  stopMovement: function() {
    this._speed = 0;
    if (this._movement) {
      this.x -= this._movement.x;
      this.y -= this._movement.y;
    }
  },

// what is the data parameter that is being passed into this function??
  TreatObtained: function(data) {
    treat = data[0].obj;
    treat.collect();
  },

  Kill: function() {
    var killed = true;
    Crafty.audio.play('kill', 1, 0.5);
    Crafty.scene('Dead');
  }
});

Crafty.c('Treat', {
  init: function() {
    this.requires('Actor');
  },
  collect: function() {
    this.destroy()
    Crafty.audio.play('eat');
    Crafty.trigger('TreatObtained', this);
  }
});

Crafty.c('Cookie', {
  init: function() {
    this.requires('Treat, spr_cookie');
  }
});

Crafty.c('Mushmousse', {
  init: function() {
    this.requires('Treat, spr_mushmousse');
  }
});

Crafty.c('Pinkpie', {
  init: function() {
    this.requires('Treat, spr_pinkpie');
  }
});

Crafty.c('Tailpie', {
  init: function() {
    this.requires('Treat, spr_tailpie');
  }
});

Crafty.c('Mushcake', {
  init: function() {
    this.requires('Treat, spr_mushcake');
  }
});

Crafty.c('Lolli', {
  init: function() {
    this.requires('Treat, spr_lolli');
  }
});

Crafty.c('Candy', {
  init: function() {
    this.requires('Treat, spr_candy');
  }
});

Crafty.c('House', {
  init: function() {
    this.requires('Treat, spr_house');
  }
});

Crafty.c('Ice', {
  init: function() {
    this.requires('Treat, spr_ice');
  }
});

Crafty.c('Cherry', {
  init: function() {
    this.requires('Treat, spr_cherry');
  }
});

Crafty.c('Fruit', {
  init: function() {
    this.requires('Treat, spr_fruit');
  }
});

Crafty.c('Heartmousse', {
  init: function() {
    this.requires('Treat, spr_heartmousse');
  }
});

Crafty.c('Chocheart', {
  init: function() {
    this.requires('Treat, spr_chocheart');
  }
});

Crafty.c('Pinkmousse', {
  init: function() {
    this.requires('Treat, spr_pinkmousse');
  }
});

Crafty.c('Chocpie', {
  init: function() {
    this.requires('Treat, spr_chocpie');
  }
});

Crafty.c('Mango', {
  init: function() {
    this.requires('Treat, spr_mango');
  }
});

Crafty.c('Strawpie', {
  init: function() {
    this.requires('Treat, spr_strawpie');
  }
});

