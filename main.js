
var ns = {};

var rankNamespace = function () {

        var currentTab = "#centerDiv";
    
        // http://stackoverflow.com/questions/20705905/bootstrap-3-jquery-event-for-active-tab-change
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            currentTab = $(e.target).attr("href") // activated tab
            
            // Hide the icons and stop audio player
            if (currentTab != "#centerDiv") {
                
                // Hide the audio icons
                d3.select("#dummyIcon").classed("hidden", true);
                d3.select("#audioIcon").classed("hidden", true);
            } else {
                
                reposition();
            }
        });
        
        var inTransition = false;
        var togglePopularity = false;
        
        var selectedGenre = "all";
        
        // References to playing and focused squares
        var playingSquare = null;
        var focusedSquare = null;
        var invalidFocused = null;

        // Speaker width and height
        var sWidth = null;
        var sHeight = null;

        // This object holds specific song details
        var songDetail = {};
        
        // This object holds the number of songs per year per genre
        var numYearGenre = {};
    
        // SVG width and height
        var width = 960 - 200;
        var height = 450 - 100;

        // Margin
        var margin = {top: 50, right: 200, bottom: 50, left: 50};

        // Main SVG
        var svg = d3.select("#centerDiv").append("svg")
                    .attr("width", width + margin.right + margin.left)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                        .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");
        
        // Fall duration for toggle popularity
        var fallDuration = 500;

        // Time formatting
        var timeFormat = d3.time.format("%Y");
        var timeFormatLast = d3.time.format("%y");
    
        // Years
        var years = [ "1965", "1970", "1975", "1980", "1985", "1990", "1995", "2000", "2005", "2010", "2015" ];

        // Genres
        var genres = [ "Pop", "Hip-Hop/Rap", "R&B/Soul", "Rock", "Country" ];
    
        // X scale
        var x = d3.time.scale()
                    .range([0, width]);

        var xOrdScale = d3.scale.ordinal()
                            .rangeRoundBands([0, width], 0.05);

        // Y scale
        var y = d3.scale.ordinal()
                    .domain([1, 2, 3, 4, 5])
                    .rangeRoundBands([0, height], 0.05);    

        // Color scale
        var color = d3.scale.category10();

        var colorScale = d3.scale.ordinal()
            .domain(genres)
            .range(["#0089ff", "#ff6200", "#00a300", "#CC00FA", "#e80000"]);
    
        // When a preview is finished, remove the stop icon and 
        // show the play icon instead
        ns.previewFinished = function() {

            d3.select('#audioIcon').classed('hidden', true);

            if (focusedSquare != null && playingSquare == focusedSquare) {

                d3.select("#dummyIcon").classed("hidden", false);
            }

            playingSquare = null;
        }
        
         
        function showDummyIcon(ele, d) {
            
            // Show the tooltip if not already
            if(!$('.popover').hasClass('in')) {
                
                $(ele).popover('show');
                
                // This fixes a bug where the tooltip doesn't appear correctly..
                // Specifically when you are quickly entering a square
                $(ele).on('shown.bs.popover', function() {

                    if(ele == focusedSquare && !$('.popover').hasClass('in')) {
                        $(ele).popover('show');
                    }
                });
            }
            
            var matrix = ele.getScreenCTM()
                            .translate(+ ele.getAttribute("x"), + ele.getAttribute("y"));

            var speaker = d3.select("#dummyIcon");

            var iWidth = ele.getAttribute("width");
            var iHeight = ele.getAttribute("height");

            if (sWidth == null || sHeight == null) {
                sWidth = iWidth - 10;
                sHeight = iWidth - 10;

                speaker.attr("width", sWidth + "px")
                    .attr("height", sHeight + "px");
            }

            var xPos = window.pageXOffset + matrix.e + iWidth/2 - sWidth/2;
            var yPos = window.pageYOffset + matrix.f + iHeight/2 - sHeight/2;
            
            if (playingSquare !== ele) {
                speaker.classed("hidden", false)
                    .style("left", xPos + "px")
                    .style("top", yPos + "px");
            } else {
               speaker.classed("hidden", true)
                    .style("left", xPos + "px")
                    .style("top", yPos + "px"); 
            }
            
            focusedSquare = ele;
        }

        
        // http://stackoverflow.com/questions/10692100/invoke-a-callback-at-the-end-of-a-transition
        function transCB(transition, callback) { 
            
            inTransition = true;
            if (transition.size() === 0) { callback(); }
            
            var n = 0; 
            transition 
                .each(function() { ++n; }) 
                .each("end", function() {
                    if (!--n) {
                        inTransition = false;
                        callback.apply(this, arguments);
                    }
                });
        }
    
        // This function repositions the 'stop' button
        function reposition() {
            
            if (currentTab != "#centerDiv") { return null; }
            
            ////

            var ele = playingSquare;

            if (ele == null) {
                 return null;
            }
            
            // Show audio icon for good measure
            d3.select("#audioIcon").classed("hidden", false);

            var matrix = ele.getScreenCTM()
                                .translate(+ ele.getAttribute("x"), + ele.getAttribute("y"));

            var iWidth = ele.getAttribute("width");
            var iHeight = ele.getAttribute("height");

            var xPos = window.pageXOffset + matrix.e + iWidth/2 - sWidth/2;
            var yPos = window.pageYOffset + matrix.f + iHeight/2 - sHeight/2;

            d3.select("#audioIcon")
                    .style("opacity", 0.55)
                    .attr("width", sWidth + "px")
                    .attr("height", sHeight + "px")
                    .attr("class", "speaker")
                    .style("left", xPos + "px")
                    .style("top", yPos + "px");
            
            if (focusedSquare != null) {
                showDummyIcon(focusedSquare, d3.select(focusedSquare)[0][0].__data__);
            }
        }
    
        function showPopularity(slide) {
            
            focusedSquare = null;
            
            var currYear = -1;
            var localArr = [];
            
            // Y-axis business
            y.rangeBands([height, 0], 0.05); 
            yGroup.call(yAxis);
            yText.text("Number of songs");
            
            if (slide) {
                
                var done = false;
                
                svg.selectAll(".square")
                    .style("cursor", function(d) {
                        if (d.Genre == selectedGenre) {
                            return "pointer";
                        }
                        return "default";
                    }).style("fill", function(d) {
                        if (d.Genre === selectedGenre) {
                            return colorScale(selectedGenre);
                        }
                        return "#c7c7c7";
                    }).interrupt().transition()
                    .call(transCB, function() {
                        
                        if (!done) {
                            reposition();
                            
                            if (focusedSquare != null) {
                                showDummyIcon(focusedSquare, d3.select(focusedSquare)[0][0].__data__);
                            }
                            done = true;
                        }
                    })
                    .attr("y", function(d, i) {

                        if (i % 5 == 0) {
                            currYear = currYear + 1;
                            localArr = domainData[years[currYear]][selectedGenre];
                        }

                        return y(localArr[d.Rank - 1]);
                    });
            } else {
                svg.selectAll(".square")
                    .style("fill", function() {
                        return "#c7c7c7";
                    })
                    .attr("y", function(d, i) {

                        if (i % 5 == 0) {
                            currYear = currYear + 1;
                            localArr = domainData[years[currYear]][selectedGenre];
                        }

                        return y(localArr[d.Rank - 1]);
                    }).interrupt().transition()
                        .duration(250)
                        .style("fill", function(d, i) {
                            if (d.Genre == selectedGenre) {
                                return colorScale(selectedGenre);
                            }
                            return "#c7c7c7";
                        });
                    
                reposition();
            }
        }
        
        // This array will hold the mapping of ranks 
        // to number of songs
        var domainData = [];
    
        // References to y-related content
        // This is outside so we can reference them in later code
        var yGroup = null;
        var yAxis = null;
        var yText = null;
    
        // Read the JSON file
        d3.json("popular_music.json", function(data) {
            
            // Set domains
            x.domain(d3.extent(data.years, function(d) { return timeFormat.parse(d.year); }));
            xOrdScale.domain(data.years.map(function(d) { return timeFormat.parse(d.year); }));

            // Construct new array
            var songArr = [];

            for (var i = 0; i < data.years.length; i++) {
                
                var year = data.years[i].year;
                    domainData[year] = { "Pop": [], "Hip-Hop/Rap": [], "R&B/Soul": [], "Country": [], "Rock": [] };
                
                numYearGenre[year] = { "Pop": 0, "Hip-Hop/Rap": 0, "R&B/Soul": 0, "Country": 0, "Rock": 0 };
                
                genres.forEach(function(gr) {

                    var arr = data.years[i].popularity.Genre[gr];
                    domainData[year][gr] = ( arr != null ? arr : [5, 4, 3, 2, 1] );
                });
                
                for (var j = 0; j < data.years[i].songs.length; j++) {
                    
                    var obj = data.years[i].songs[j];
                    
                    numYearGenre[year][obj.Genre] = numYearGenre[year][obj.Genre] + 1;
                    
                    obj["Year"] = year;
                    obj["Rank"] = j + 1;
                    
                    songArr.push(obj);
                }
            }

            function doneLoadingDetails() {

                // X-axis
                var xAxis = d3.svg.axis()
                    .scale(xOrdScale)
                    .orient("bottom")
                    .tickFormat(timeFormat);

                // Y-axis
                yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left")
                    .tickFormat(function(d) { return d; });

                // Draw X-axis
                var xGroup = svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0, " + height + ")")
                    .call(xAxis);

                // Draw Y-axis
                yGroup = svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis);
                
                // Draw Y-text
                yText = yGroup.append("text")
                            .attr("transform", "rotate(-90)")
                            .attr("x", -height/2)
                            .attr("dy", "-2em")
                            .attr("text-anchor", "middle")
                            .style("font-weight","bold")
                            .style("font-size","18px")
                            .text("Rank");
                
                // Create all of the music squares
                var squares = svg.selectAll(".square")
                    .data(songArr, function(d) { return d.Title; })
                    .enter()
                    .append("rect")
                        .attr("x", function(d) { return xOrdScale(timeFormat.parse(d.Year)); })
                        .attr("y", function(d) { return y(d.Rank); })
                        .attr("rx", 2)
                        .attr("ry", 2)
                        .attr("class", "square")
                        .attr("width", xOrdScale.rangeBand())
                        .attr("height", y.rangeBand())
                        .style("fill", function(d) { return "#c7c7c7"; } )
                        .each(function(d, i){
                        
                            $(this).popover({

                                container: 'body',
                                placement : +d.Year < 1995 ? "right" : "left",

                                delay: { "show": 100, "hide": 100 },

                                trigger: 'manual',

                                html : true,
                                content: function() {

                                    return '<div id="pCon" class="media"><a href="#" class="pull-left"><img src="' + songDetail[d.Title].cover + '" width="120px" height="120px" class="media-object"></a><div class="media-body"><h4 class="display-1">' + d.Title + '</h4><h5>' + d.Artist + '</h5><hr></div><h6>Year: ' + d.Year + '<br>Genre: ' + d.Genre + '<br>Rank: ' + d.Rank + '</h6></div></div></div>';
                                }
                            });
                        })
                        .on("click", function(d) {
                            
                            // Do not respond if in transition
                            if (inTransition) {
                                return null;
                            }
                            
                            // If grayed out, then focus this square  
                            // and show all other genres
                            if (this.style.fill == "rgb(199, 199, 199)") {
                                
                                showAllGenres(this);
                                return null;
                            }

                            var URL = songDetail[d.Title].preview;
                            var player = d3.select("#player");
                            document.getElementById("player").volume = 0.5;

                            if (playingSquare == this) {

                                playingSquare = null;

                                d3.select("#audioIcon")
                                    .classed("hidden", true);

                                d3.select("#dummyIcon")
                                    .classed("hidden", false);

                                player.attr("src", "");
                                document.getElementById('player').currentTime = 0;
                            } else {

                                playingSquare = this;
                                reposition();

                                d3.select("#dummyIcon")
                                    .classed("hidden", true);

                                player.attr("src", URL);
                                document.getElementById('player').play();
                            }
                        })
                        .on("mouseover", function(d) {
                            
                            var ele = d3.select(this);
                            
                            // If grayed out, then return
                            if (this.style.fill == "rgb(199, 199, 199)" || songDetail[d.Title] == null) {

                                ele.style("cursor", "default");
                                $(this).popover('hide');
                                
                                invalidFocused = this;
                                return null;
                            }
                            
                            ele.style("cursor", "pointer");
                            focusedSquare = this;
                            
                            if (!inTransition) {
                                showDummyIcon(this, d);
                            }
                        })
                        .on("mouseout", function() {

                            focusedSquare = null;
                    
                            d3.select(this).style("cursor", "pointer");
                            d3.select("#dummyIcon").classed("hidden", true);
                            
                            $(this).popover('hide');
                        });

                var trans = d3.selectAll(".square")
                    .transition()
                     .delay(function(d, i) {
                        return i * 25;
                    })
                    .duration(250)
                    .style("fill", function(d, i) {return colorScale(d.Genre); });
            }



            var cacheTotal = 0;

            // Cache results
            songArr.forEach(function(d) {

                var artist = d.Artist.replace(/ /g, '+');

                if (d.Artist.indexOf("feat.") != -1) {
                    artist = d.Artist.substring(0, d.Artist.indexOf("feat.")-1).replace(/ /g, '+');
                }

                var title = d.Title.replace(/ /g, '+');

                var xmlhttp = new XMLHttpRequest();

                xmlhttp.onreadystatechange = function() {
                   if (xmlhttp.readyState == 4) {

                        if ( JSON.parse(xmlhttp.responseText).tracks.total == 0) {
                            
                            if (d.Title == "Nothing Compares 2 U") {
                                songDetail[d.Title] = { preview: "mp3/nothingc2u.mp3", cover: "img/nothingc2u.jpg" };
                            } else { // No information found..
                               songDetail[d.Title] = { preview: "", cover: "" }; 
                            }
                        } else {

                            var json = JSON.parse(xmlhttp.responseText);

                            var URL = json.tracks.items[0].preview_url;
                            var IMG = json.tracks.items[0].album.images[0].url;

                            songDetail[d.Title] = { preview: URL, cover: IMG };
                        }

                        cacheTotal = cacheTotal + 1;

                        if (cacheTotal >= 55) {
                            doneLoadingDetails();
                        }
                    }
                }

                xmlhttp.open("GET", "https://api.spotify.com/v1/search?q=artist:" + artist + "+title:" + title + "&type=track&limit=1", true);
                xmlhttp.send(null);
            });
        });

        // On window resize, reposition the tooltip and the stop icon 
        window.addEventListener('resize', function() {
            
            if ($(focusedSquare) != null) {

                $(focusedSquare).popover('show');
            }
            
            reposition();
        });
        
    
        function getCorrRank(element) {
            
            var data = d3.select(element)[0][0].__data__;

            var yr = data.Year;
            var rank = data.Rank;

            // This code simply gets the # of songs position 
            // and translates it to get the sought after rank position
            var arr = domainData[yr][selectedGenre];
            var soughtRank = (5-arr[rank-1]+1);
            
            return { rank: soughtRank, year: yr, equal: (soughtRank == rank) };
        }
        
        function getCorrNum(element) {
            
            var data = d3.select(element)[0][0].__data__;

            var yr = data.Year;
            var rank = data.Rank;

            // This code simply gets the # of songs position 
            // and translates it to get the sought after rank position
            var arr = domainData[yr][selectedGenre];
            var soughtNum = arr[rank-1];
            
            return { num: soughtNum, equal: (soughtNum == (5-rank+1)) };
        }
    
        // Draw legend
        
        var lW = 145;
        var lH = 180;

        var pX = width + 25;
        var pY = height - lH - 30 - 5;
        
        var pButton = svg.append("rect")
                        .attr("class", "popButton")
                        .attr("x", pX)
                        .attr("y", pY - 35)
                        .attr("width", lW)
                        .attr("height", 30)
                        .attr("fill", "#e6e6e6")
                        .style("stroke", "black")
                        .style("stroke-size", "2px")
                            .on("mouseover", function() {
                                d3.select(this).style("display", "block")
                                    .style("cursor", "pointer");    
                            })
                            .on("mouseout", function() {
                                d3.select(this).style("display", "block")
                                    .style("cursor", "default");    
                            })
                            .on("click", function() {
                                
                                
                                // Hide the stop icon
                                // d3.select("#audioIcon").classed("hidden", true);
                                
                                // Set focused square to null
                                focusedSquare = null;
                                
                                // Toggle popularity
                                togglePopularity = !togglePopularity;
                                
                                if (togglePopularity) {
                                    
                                    // Color the button green
                                    pButton.style("fill", "#70d000");
                                    
                                    if (playingSquare != null) {
                                        var result = getCorrNum(playingSquare);
                                        var equal = result.equal;
                                        
                                        if (!equal) {
                                            d3.select("#audioIcon").classed("hidden", true);
                                        }
                                    }
                                    
                                    showPopularity(true);
                                } else {
                                    
                                    // Color the button grey
                                    pButton.style("fill", "#e6e6e6");
                                    
                                    if (playingSquare != null) {
                                        var equal = getCorrRank(playingSquare).equal;
                                        
                                        if (!equal) {
                                            d3.select("#audioIcon").classed("hidden", true);
                                        }
                                    }
                                    
                                    // Show rank
                                    yText.text("Rank");
                                    y.rangeBands([0, height], 0.05); 
                                    yGroup.call(yAxis);
                                    
                                    d3.select("#dummyIcon").classed("hidden", true);
                                    
                                    var done = false;
                                    
                                    var trans = svg.selectAll(".square")
                                        .interrupt().transition()
                                        .call(transCB, function() {
                                                
                                            if (!done) {
                                                
                                                reposition();

                                                /*if (focusedSquare != null) {
                                                    showDummyIcon(focusedSquare, d3.select(focusedSquare)[0][0].__data__);
                                                }*/

                                                done = false;
                                            }
                                        })
                                        .style("fill", function(d) {
                                            if (d.Genre === selectedGenre) {
                                                return colorScale(selectedGenre);
                                            }
                                            return "#c7c7c7";
                                        })
                                        .attr("y", function(d) {
                                            
                                           return y(d.Rank); 
                                        });
                                }
                            })
                            .classed("hidden", true);
        

        var pText = svg.append("text")
            .attr("class", "popText")
            .attr("x", pX + lW/2)
            .attr("y", pY - 25 + 15)
            .attr("dy", "-0.3em")
            .attr("text-anchor", "middle")
            .style("font-weight","bold")
            .style("font-size","16px")
            .text("Show Popularity")
            .classed("hidden", true);
        
        var lW = 145;
        var lH = 180;

        var lX = width + 25;
        var lY = height - lH;
        
        
        function showAllGenres(ref) {
            
            if (togglePopularity && playingSquare != null) {
                
                var result = getCorrRank(playingSquare);
                
                // If the sought after rank is not equal to 
                // the playingSquare rank, then the square needs to move
                if (!result.equal) {
                    
                    d3.select("#audioIcon").classed("hidden", true);
                }
            }
            
            focusedSquare = null;
            
            if (togglePopularity && ref != null && selectedGenre != "all") {
                
                var result = getCorrRank(ref);
                
                var year = result.year;
                var soughtRank = result.rank;
                
                // We then loop through to get the correct square..
                svg.selectAll(".square").filter(function(d) {
                    
                    if (focusedSquare == null && d.Year == year && d.Rank == soughtRank) {
                        
                        focusedSquare = this;
                    }
                });
            } else if (!togglePopularity && ref != null && selectedGenre != "all") {
                
                focusedSquare = ref;
            }
            
            if (selectedGenre == "all") {
                return null;
            }
            
            selectedGenre = "all";
            
            // Y-axis business
            y.rangeBands([0, height], 0.05); 
            yGroup.call(yAxis);
            yText.text("Rank");
            
            // Hide popularity button and text
            pButton.classed("hidden", true);
            pText.classed("hidden", true);
            
            // Reposition and recolor squares
            svg.selectAll(".square")
                .interrupt().transition()
                .call(transCB, function() {
                    
                    reposition();
                    
                    if (focusedSquare != null) {
                        // Show tooltip
                        $(focusedSquare).popover('show');
                        // Show cursor hand
                        d3.select(focusedSquare).style("cursor", "pointer");
                        // Show dummy play icon
                        showDummyIcon(focusedSquare, d3.select(focusedSquare)[0][0].__data__);
                    }
                })
                .attr("y", function(d, i) {
                    return y(d.Rank);
                })
                .style("fill", function(d) {
                    return colorScale(d.Genre);
                });
        }
    
        var button = svg.append("rect")
                        .attr("class", "showButton")
                        .attr("x", lX)
                        .attr("y", lY - 35)
                        .attr("width", lW)
                        .attr("height", 30)
                        .attr("fill", "#e6e6e6")
                        .style("stroke", "black")
                        .style("stroke-size", "2px")
                            .on("mouseover", function() {
                                d3.select(this).style("display", "block")
                                    .style("cursor", "pointer");    
                            })
                            .on("mouseout", function() {
                                d3.select(this).style("display", "block")
                                    .style("cursor", "default");    
                            })
                            .on("click", function() {
                                
                                showAllGenres();
                            });

        svg.append("text")
            .attr("class", "legendText")
            .attr("x", lX + lW/2)
            .attr("y", lY - 25 + 15)
            .attr("dy", "-0.3em")
            .attr("text-anchor", "middle")
            .style("font-weight","bold")
            .style("font-size","16px")
            .text("Show All Genres");

        var rect = svg.append("rect")
                        .attr("x", lX)
                        .attr("y", lY)
                        .attr("width", lW)
                        .attr("height", lH)
                        .attr("fill", "#bcbcbc")
                        .style("stroke", "black")
                        .style("stroke-size", "2px");

        var legendScale = d3.scale.ordinal()
                            .domain(genres)
                            .rangeBands([0, lH], 0.2);    

        var legendG = svg.selectAll(".legendRect")
                        .data(genres)
                        .enter()
                        .append("g");
    
        var legendRect = legendG.append("rect")
            .attr("class", "legendRect")
            .attr("x", lX + 5)
            .attr("y", function(d) { return lY + legendScale(d); })
            .attr("width", legendScale.rangeBand())
            .attr("height", legendScale.rangeBand())
            .style("fill", function(d) { return colorScale(d); })
            .style("stroke", "black")
            .style("stroke-width", "1px");

        legendRect.on("mouseover", function() {
            d3.select(this).style("display", "block")
                .style("cursor", "pointer");    
        });

        legendRect.on("mouseout", function() {
            d3.select(this).style("display", "block")
                .style("cursor", "default");    
        });

        legendRect.on("click", function(genre) {
            
            focusedSquare = null;
            
            if (selectedGenre === genre) {
                
                showAllGenres();
            } else {
                selectedGenre = genre;
                
                // Stop the player if different genre selected
                if (playingSquare != null && d3.select(playingSquare)[0][0].__data__.Genre != genre) {

                    playingSquare = null;
                    
                    d3.select("#audioIcon")
                        .classed("hidden", true);

                    d3.select("#player").attr("src", "");
                    document.getElementById('player').currentTime = 0;
                }
                
                // Show popularity button and text
                pButton.classed("hidden", false);
                pText.classed("hidden", false);
                
                if (togglePopularity) {
                    showPopularity();
                } else {
                    
                    var trans = svg.selectAll(".square")
                        .interrupt().transition()
                        .call(transCB, function() {
                            
                            d3.select("#dummyIcon").classed("hidden", true);

                            if (focusedSquare != null) {

                                showDummyIcon(focusedSquare, d3.select(focusedSquare)[0][0].__data__);
                            }
                        })
                        .style("fill", function(d) {
                            if (d.Genre === genre) {
                                return colorScale(genre);
                            }
                            return "#c7c7c7";
                        });
                }
            }
        });

        legendG.append("text")
            .attr("class", "legendText")
            .attr("x", lX + 38)
            .attr("y", function(d) { return lY + legendScale(d); })
            .attr("dy", "1.4em")
            .style("font-weight", "bold")
            .style("font-size", "14px")
            .text(function(d) { return d; });
}();