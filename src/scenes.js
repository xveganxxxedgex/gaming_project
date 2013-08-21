// GAME SCENE 1
// ------------------

/////// NEED TO DO :
// Make the minotaur kill you upon touch of all sides
// Make a finish square that will only allow the game to end if you have ALL the treats AND are 
// standing on it...
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

 
  // Player character, placed at 15, 0 on our grid
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

  for (var x = 0; x < Game.map_grid.width; x++) {
    for (var y = 0; y < Game.map_grid.height; y++) {
      if ((y == 2) && (x >= 2 && x <= 37 && x != 8 && x != 14 && x != 16 && x != 18 && x != 19 && x != 20 && x != 29 && x != 31)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 4) && (x >= 1 && x <= 35 && x != 6 && x != 8 && x != 9 && x != 10 && x != 12 && x != 14 && x != 16 && x != 17 && x != 18 && x != 20 && x != 22)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 5) && (x >= 1 && x <= 23 && x != 1 && x != 2 && x != 3 && x != 4 && x != 6 && x != 8 && x != 9 && x != 10 && x != 12 && x != 14 && x != 20 && x != 22)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 6) && (x >= 26 && x <= 33)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 7) && (x >= 2 && x <= 23 && x != 8 && x != 10 && x != 9 && x != 10 && x != 18 && x != 20 && x != 22 && x != 24)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 7) && (x == 29 || x == 33)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 8) && (x == 27 || x == 31)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 9) && (x >= 1 && x <= 34 && x != 5 && x != 16 && x != 20 && x != 22 && x != 24 &&  x != 26)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 11) && (x >= 2 && x <= 24 && x != 9 && x != 18 && x != 22 && x != 24)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 11) && (x >= 26 && x <= 37)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 13) && (x >= 2 && x <= 24 && x != 3 && x != 11 && x != 16 && x != 18 && x != 20 && x != 22 && x != 24)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 13) && (x >= 27 && x <= 38)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 15) && (x >= 2 && x <= 36 && x != 3 && x != 5 && x != 14 && x != 16 && x != 18 && x != 20 && x != 22 && x != 24)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 16) && (x >= 2 && x <= 24 && x != 3  && x != 5 && x != 7 && x != 8 && x != 9 && x != 10 && x != 11 && x != 12 && x != 14 && x != 16 && x != 18 && x != 20 && x != 22 && x != 24)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 17) && (x >= 30 && x <= 34)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 19) && (x >= 2 && x <= 24 && x != 3 && x != 5 && x != 12 && x != 14 && x != 16 && x != 18 && x != 20 && x != 22 && x != 24)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 21) && (x >= 2 && x <= 24 && x != 3 && x != 14 && x != 16 && x != 18 && x != 20 && x != 22 && x != 24)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 23) && (x >= 2 && x <= 24 && x != 20 && x != 22 && x != 23 && x != 24)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 25) && (x >= 1 && x <= 24 && x != 9 && x != 20 && x != 22 && x != 23 && x != 24)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 26) && (x == 8 || x == 10 || x == 24 || x == 25)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 27) && (x >= 30 && x <= 32)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 28) && (x == 2 || x == 8 || x == 10 && x == 11 && x == 12 || x == 25)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 29) && (x >= 2 && x <= 35 && x != 3 && x != 9 && x != 10 && x != 11 && x != 12 && x != 13 && x != 26)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 30) && (x >= 2 && x <= 14 && x != 3 && x != 4 && x != 5 && x != 6 && x != 7 && x != 9)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 31) && (x >= 2 && x <= 37 && x != 7 && x != 9 && x != 11 && x != 12 && x != 13)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 32) && (x == 2 || x == 8 && x == 10 || x == 12)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 33) && (x >= 2 && x <= 37 && x != 3 && x != 5 && x != 7 && x != 9)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 35) && (x >= 2 && x <= 38 && x != 3 && x != 5 && x != 7 && x != 9 && x != 11)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((y == 37) && (x >= 2 && x <= 37 && x != 3 && x != 5 && x != 7 && x != 9)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }

      if ((x == 27) && (y <= 29 && y >= 16)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      } 
      if ((x == 29) && (y <= 27 && y >= 17)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      } 
      if ((x == 33) && (y <= 27 && y >= 19)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      } 
      if ((x == 35) && (y <= 29 && y >= 17)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      } 
      if ((x == 35) && (y <= 9 && y >= 5)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      } 
      if ((x == 37) && (y <= 30 && y >= 15)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      } 
      if ((x == 37) && (y >= 3 && y <= 10)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      } 
      if ((x == 2) && y == 6) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      } 
      if (x == 5 && y == 5) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if (x == 7 && y <= 7 && y != 0) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 9) && (y >= 6 && y <= 8)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 11) && ((y >= 5) && (y <= 7))) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      } 
      if ((x == 13) && ((y == 3) || (y == 4) || (y == 6))) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      } 
      if ((x == 15) && ((y !== 0) && (y != 1) && (y <= 5))) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      } 
      if ((x == 17) && ((y <= 3 && y != 0) || (y == 5 && y != 0))) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      } 
      if ((x == 18) && (y == 5 && y != 0)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      } 
      if ((x == 19) && (y <= 9 && y != 2 && y != 0)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      } 
      ////////////////////////// END SECTION 1 //////////////////////////
      if ((x <= 8 && x != 0 && x != 1) && (y == 11 && y != 1 && y != 0)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      } 
      if ((x == 8) && (y == 10)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      } 
      if ((x == 2) && (y >= 11 && y <= 23)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 19) && (y <= 22 && y >= 11)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 18) && (y == 14)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 15) && (y <= 23 && y >= 13)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 10) && (y <= 12 && y >= 11)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 17) && (y <= 11 && y >= 10)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 4) && (y <= 21 && y >= 13)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 13) && (y <= 21 && y >= 15)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 6) && (y <= 19 && y >= 16)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 11) && (y <= 18 && y >= 17)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 17) && (y <= 21 && y >= 12)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 8) && (y >= 26 && y <= 33)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x >= 2 && x <= 7) && (y == 33)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 2) && (y >= 27 && y <= 37)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 4) && (y >= 35 && y <= 38)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 6) && (y >= 33 && y <= 37)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 8) && (y >= 35 && y <= 38)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x >= 3 && x <= 6) && (y == 27)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x >= 4 && x <= 7) && (y == 29)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x >= 3 && x <= 6) && (y == 31)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 10) && (y <= 37 && y >= 25 && y != 29)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 21) && (y == 24)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x >= 11 && x <= 12) && (y == 28)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x >= 12 && x <= 23) && (y == 27)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 23) && (y == 26)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 21) && (y <= 10 && y >= 2)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x >= 22 && x <= 28) && (y == 2)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 30) && (y >= 1 && y <= 4)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x >= 23 && x <= 29) && (y == 4)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 23) && (y >= 5 && y <= 15)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 21) && (y <= 14 && y >= 13)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 21) && (y <= 23 && y >= 17)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 25) && (y <= 25 && y >= 6)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x == 23) && (y <= 20 && y >= 17)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x >= 23 && x <= 24) && (y == 22)) {
        Crafty.e('Maze_Up').at(x, y);
        this.occupied[x][y] = true;
      }
      if ((x >= 22 && x <= 23) && (y == 24)) {
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
          if(new_sweet == 1) {
            Crafty.e('Mushmousse').at(x, y);
          }
          else if(new_sweet == 2) {
            Crafty.e('Pinkpie').at(x, y);
          }
          else if(new_sweet == 3) {
            Crafty.e('Tailpie').at(x, y);
          }
          else if(new_sweet == 4) {
            Crafty.e('Mushcake').at(x, y);
          }
          else if(new_sweet == 5) {
            Crafty.e('Lolli').at(x, y);
          }
          else if(new_sweet == 6) {
            Crafty.e('Candy').at(x, y);
          }
          else if(new_sweet == 7) {
            Crafty.e('House').at(x, y);
          }
          else if(new_sweet == 8) {
            Crafty.e('Ice').at(x, y);
          }
          else if(new_sweet == 9) {
            Crafty.e('Cherry').at(x, y);
          }
          else if(new_sweet == 10) {
            Crafty.e('Heartmousse').at(x, y);
          }
          else if(new_sweet == 1) {
            Crafty.e('Chocheart').at(x, y); 
          }
          else if(new_sweet == 12) {
            Crafty.e('Pinkmousse').at(x, y); 
          }
          else if(new_sweet == 13) {
            Crafty.e('Chocpie').at(x, y);
          }
          else if(new_sweet == 14) {
            Crafty.e('Mango').at(x, y);
          }
          else if(new_sweet == 15) {
            Crafty.e('Strawpie').at(x, y);
          }
          else if(new_sweet == 16) {
            Crafty.e('Cookie').at(x, y);
          }
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
      alert("killed");
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
      theme:    ['assets/breezy.mp3']  ///////////////ENABLE MUSIC
    });


    Crafty.audio.play("theme", -1);  ///////////////ENABLE MUSIC
 
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
