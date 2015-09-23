var DesertSolitaire = {
    suits : ["hearts", "spades", "diamonds", "clubs"],
    values : ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"],
    states : { RUNNING : 1, NEEDS_RESHUFFLE : 2, WON : 3 },

    Card : function(suit, value) {
        this.suit = suit;
        this.value = value;

        this.isNextCardInSameSuit = function(card) {
            if (!card) {
                return false;    
            }
            return card.suit == this.suit && DesertSolitaire.values.indexOf(card.value) == DesertSolitaire.values.indexOf(this.value) + 1;    
        }

        this.toString = function() {
            return this.suit + "-" + this.value;    
        }
    },

    Engine : function(listener) {    
        var self = this;

        self.state = DesertSolitaire.states.RUNNING; 
        self.score =  {
            time : 0,
            moves : 0,
            shuffles : -1
        };
        self.listener = listener;

        function createDeckWithoutAces() {
            var result = [];

            DesertSolitaire.suits.forEach(function(suit) {
                DesertSolitaire.values.forEach(function(value, index) {
                    if (index > 0) {
                        result.push(new DesertSolitaire.Card(suit, value));    
                    }
                });
            });
            return shuffleArray(result);
        }

        function createRows(deck) {
            var rows = [];
            DesertSolitaire.suits.forEach(function(suit) {
                rows.push([new DesertSolitaire.Card(suit, DesertSolitaire.values[0])])   
            });
            deck.forEach(function(card, index) {
                rows[index % rows.length].push(card);    
            });
            return rows;
        }

        function shuffleArray(array) {
            for (var i = array.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
            return array;
        }

        function smallestRow(rows) {
            var smallestIndex = 0;
            var smallestSize = DesertSolitaire.values.length;
            rows.forEach(function(row, index) {
                if (row.length < smallestSize) {
                    smallestIndex = index;
                    smallestSize = row.length;
                }
            }); 
            return smallestIndex;
        }

        this.updateState = function() {
            self.state = DesertSolitaire.states.RUNNING;

            var completed = 0;
            var impossible = 0;
            for (var i = 0; i < self.rows.length; i++) {
                if (self.countCompleted(i) == DesertSolitaire.values.length) {
                    completed++;    
                }
                impossible += this.countImpossible(self.rows[i]);
            }

            if (completed == self.rows.length) {
                clearInterval(self.interval);
                self.state = DesertSolitaire.states.WON;
                listener.stateChanged();
            } else if (impossible == self.rows.length) {
                self.state = DesertSolitaire.states.NEEDS_RESHUFFLE;
                listener.stateChanged();
            }
        }

        this.countImpossible = function(row) {
            var count = 0;
            row.forEach(function(card, index) {
                if (card == null && (row[index - 1] == null || row[index - 1].value == DesertSolitaire.values[DesertSolitaire.values.length - 1])) {
                    count++;    
                }
            });
            return count;
        }

        this.countCompleted = function(rowIndex) {
            var count = 1;
            while (count < self.rows[rowIndex].length) {
                if (!self.rows[rowIndex][count -1].isNextCardInSameSuit(self.rows[rowIndex][count])) {
                    break;    
                }
                count++;
            }
            return count;
        }

        this.shuffleRows = function() {
            var unused = [];
            self.rows.forEach(function(row, i) {
                var index = self.countCompleted(i);
                unused = unused.concat(row.slice(index));    
                self.rows[i] = row.slice(0, index);
            });
            unused = shuffleArray(unused);
            unused.forEach(function(card, i) {
                if (!card) {
                    return;    
                }
                var smallestIndex = smallestRow(self.rows);
                self.rows[smallestIndex].push(card);    
            });
            self.rows.forEach(function(row, i) {
                var index = self.countCompleted(i);
                row.splice(index, 0, null);
            });

            self.score.shuffles++;
            self.updateState();

            return self.rows;
        }

        this.moveCard = function(fromRow, fromIndex, toRow, toIndex) {
            var card = self.rows[fromRow][fromIndex];
            var previousCard = self.rows[toRow][toIndex - 1];
            if (!previousCard.isNextCardInSameSuit(card)) {
                return;    
            }

            self.rows[fromRow][fromIndex] = self.rows[toRow][toIndex];
            self.rows[toRow][toIndex] = card;

            self.score.moves++;
            self.updateState();
        }    

        this.stop = function() {
            clearInterval(self.interval);
        }

        this.start = function() { 
            self.interval = setInterval(function() { self.score.time++; self.listener.scoreChanged();} , 1000);

            self.rows = createRows(createDeckWithoutAces());
            self.shuffleRows();
        }
    },
    
    Statistics : function() {
        var maxCount = 3;
        
        function get(key, def) {
            var data = JSON.parse(window.localStorage.getItem(key));
            return !data ? def : data;    
        }
        
        function write(key, value) {
            window.localStorage.setItem(key, JSON.stringify(value));
        }
        
        function mergeStats(key, data, newValue) {
            if (data.best == 0 || newValue < data.best) {
                data.best = newValue;    
            }
            if (newValue > data.worst) {
                data.worst = newValue;    
            }
            data.total += newValue;
            write(key, data);
        }
        
        function insertPlay(plays, score) {
            function queryPlayerName() {
                return window.prompt("Player name", "Player #1");    
            }
            
            for (var i = 0; i < plays.length; i++) {
                if (score.time < plays[i].time) {
                    plays.splice(i, 0, {name : queryPlayerName(), time : score.time, moves : score.moves, shuffles : score.shuffles });
                    return;
                }
            }
            if (plays.length < maxCount) {
                plays.push({name : queryPlayerName(), time : score.time, moves : score.moves, shuffles : score.shuffles });        
            } 
        }
        
        this.add = function(score) {
            var plays = this.topPlays();
            insertPlay(plays, score);
            while (plays.length > maxCount) {
                plays.pop();    
            }
            
            
            write("plays", plays);       
            write("total", this.timesPlayed() + 1);
            mergeStats("time", this.timeStats(), score.time);
            mergeStats("moves", this.movesStats(), score.moves);
            mergeStats("shuffles", this.shufflesStats(), score.shuffles);
        }
        
        this.timesPlayed = function() {
            return get("total", 0);
        }
    
        this.topPlays = function() {
            return get("plays", []);
        }
        
        this.timeStats = function() {
            return get("time", {best : 0, worst : 0, total : 0}); 
        }
        
        this.movesStats = function() {
            return get("moves", {best : 0, worst : 0, total : 0});    
        }
        
        this.shufflesStats = function() {
            return get("shuffles", {best : 0, worst : 0, total : 0});    
        }
    },

    GUI : function() {
        var self = this;

        function addClickHandler(query, callback) {
            var divs = document.querySelectorAll(query);
            for (var i = 0; i < divs.length; i++) {
                divs[i].onclick = callback;
            }    
        }

        function updateContent(query, value) {
            var scores = document.querySelectorAll(query);
            for (var i = 0; i < scores.length; i++) {
                scores[i].innerHTML = value;    
            }               
        };

        function createListener() {
            return {
                scoreChanged : self.showScore,
                stateChanged : function() { 
                    switch (self.engine.state) {
                        case DesertSolitaire.states.WON:
                            self.statistics.add(self.engine.score);
                            self.showWinScreen();
                            break;
                        case DesertSolitaire.states.NEEDS_RESHUFFLE:
                            self.toggleShuffle();
                            break;
                    }
                }
            };    
        }
        
        function clearChildren(div) {
            var child = div.firstChild;

            while(child) {
                div.removeChild(child);
                child = div.firstChild;
            }    
        }
        
        function formatTime(seconds) {
            return new Date(seconds * 1000).toISOString().substr(11, 8);    
        }

        this.init = function() {
            self.statistics = new DesertSolitaire.Statistics();
            addClickHandler(".restart", self.restart);
            addClickHandler(".shuffle", self.shuffle);
            addClickHandler(".highscore", self.showHighScore);
            addClickHandler(".close", self.hideHighScore);
            addClickHandler(".rules", self.showRules);
            self.start();
        }

        this.shuffle = function() {
            self.engine.shuffleRows(); 
            self.showScore();
            self.drawRows();
            self.toggleShuffle();
        }

        this.restart = function() {
            self.engine.stop();
            self.start();
        }

        this.start = function() {
            document.getElementById("won").style.display = 'none';
            self.engine = new DesertSolitaire.Engine(createListener());
            self.engine.start();
            self.drawRows();
            self.showScore();
            self.toggleShuffle();
        }

        this.toggleShuffle = function() {
            document.querySelector(".shuffle").disabled = self.engine.state != DesertSolitaire.states.NEEDS_RESHUFFLE;    
        }

        this.showScore = function() {
            var score = self.engine.score;

            updateContent(".score .time", formatTime(score.time));
            updateContent(".score .moves", score.moves);
            updateContent(".score .shuffles", score.shuffles);
        }

        this.showWinScreen = function() {
            self.showScore();
            document.getElementById("won").style.display = 'block'; 
        }
        
        this.showRules = function() {
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function(){
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200){
                    alert(xmlhttp.responseText);
                }
            }
            xmlhttp.open("GET", "README.md", true);
            xmlhttp.send();    
        }

        this.drawRows = function() {
            self.engine.rows.forEach(function(row, rowIndex) {
                var divs = document.querySelectorAll(".full-suit");
                clearChildren(divs[rowIndex]);
                

                row.forEach(function(card, index) {
                    self.drawCard(card, divs[rowIndex], rowIndex, index);    
                });
            });
        }

        this.drawCard = function(card, parentDiv, row, index) {
            var div = document.createElement("div");
            div.classList.add("card");
            if (card == null) {
                div.classList.add("placeholder"); 

                div.ondrop = function (event) {
                    this.classList.remove('droppable');
                    self.engine.moveCard(parseInt(event.dataTransfer.getData("row")), parseInt(event.dataTransfer.getData("index")), row, index);
                    self.drawRows();
                    self.showScore();
                };

                div.ondragover = function (event) {
                    this.classList.add('droppable'); 
                    event.preventDefault();    
                }

                div.ondragleave = function (event) {
                    this.classList.remove('droppable'); 
                }
            } else {
                div.classList.add(card.toString());
                
                div.draggable = true;

                div.ondragstart = function(event) {
                    event.dataTransfer.setData('row', row);
                    event.dataTransfer.setData('index', index);
                };
            }
            parentDiv.appendChild(div);
        }
        
        this.showHighScore = function() {
            document.getElementById("won").style.display = 'none';         
            document.getElementById("highscore").style.display = 'block';
            
            function td(value) {
                var td = document.createElement("td");
                td.innerHTML = value;
                return td;      
            };
            
            function stats(id, best, average, worst, total) {
                var tr = document.querySelector(id + " tbody tr");
                clearChildren(tr);
                tr.appendChild(td(best));
                tr.appendChild(td(average));
                tr.appendChild(td(worst));
                tr.appendChild(td(total));
            }
            
            var timesPlayed = self.statistics.timesPlayed();
            document.getElementById("times-played").innerHTML = timesPlayed;
            
            var best = document.querySelector("#best tbody");
            clearChildren(best);
            
            self.statistics.topPlays().forEach(function(play, index) {
                var tr = document.createElement("tr");
                tr.appendChild(td(index + 1));
                tr.appendChild(td(play.name));
                tr.appendChild(td(play.time));
                tr.appendChild(td(play.moves));
                tr.appendChild(td(play.shuffles));
                best.appendChild(tr);
            });
            
            var time = self.statistics.timeStats();
            var moves = self.statistics.movesStats();
            var shuffles = self.statistics.shufflesStats();
            
            stats("#time-statistics", formatTime(time.best), formatTime(Math.ceil(time.total / Math.max(timesPlayed, 1))), formatTime(time.worst), formatTime(time.total)); 
            stats("#moves-statistics", moves.best, (moves.total / Math.max(timesPlayed, 1)).toFixed(2), moves.worst, moves.total); 
            stats("#shuffles-statistics", shuffles.best, (shuffles.total / Math.max(timesPlayed, 1)).toFixed(2), shuffles.worst, shuffles.total); 
        }
        
        this.hideHighScore = function() {
            document.getElementById("highscore").style.display = 'none';     
        }
    }
}