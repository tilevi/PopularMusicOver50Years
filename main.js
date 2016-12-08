/*
    Main visualization
                        main.js
*/

// For audio 'onended' callback
var ns = {};

// Encapsulates the code to avoid conflicts
var rankNamespace = function () {

        var currentTab = "#mainDiv";
        
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            
            // Activated tab
            currentTab = $(e.target).attr("href")
            
            // Hide the icons and stop audio player if we are not 
            // switching to the main visualization tab
            if (currentTab != "#mainDiv") {
                
                // Stop playing music and hide the icons
                stopPlayer();
            } else {
                
                // Otherwise, let's reposition the stop icon (if applicable)
                repositionStop();
            }
        });
        
    
        // Booleans for transition and popularity
        var inTransition = true;
        var togglePopularity = false;
        
        // Selected genre
        var selectedGenre = "all";
        
        // References to playing and focused squares
        var playingSquare = null;
        var focusedSquare = null;
        
        // Speaker width and height (initially null)
        var sWidth = null;
        var sHeight = null;

        // References to y-related content
        // This is outside so we can reference them in later code
        var yGroup = null;
        var yAxis = null;
        var yText = null;
        
        // This object holds specific song details
        // These details will be the cover and mp3 URLs
        var songDetail = {};
        
        // This object holds the number of songs per year 
        // for each genre
        var numYearGenre = {};
        
        // This object will hold the mapping of ranks 
        // to number of songs
        var mapData = {};
        
        // Colors
        var colors = { gray: "rgb(222, 222, 222)", 
                      lightgray: "rgb(230, 230, 230)", 
                      lightgreen: "#7de800", 
                      blue: "#0089ff", 
                      orange: "#ff6200", 
                      green: "#00a300", 
                      purple: "#CC00FA", 
                      red: "#e80000" };
        
        // Used to track mouse position during a transition
        // This is used to fix a minor bug involving the popover
        var mouseX = 0;
        var mouseY = 0;
        
        // SVG width and height
        var width = 760;
        var height = 350;

        // Margin
        var margin = {top: 15, right: 175, bottom: 50, left: 50};
        
        // Main SVG
        var svg = d3.select("#mainDiv").append("svg")
                    .attr("width", width + margin.right + margin.left)
                    .attr("height", height + margin.top + margin.bottom)
                    .on("mousemove", function() {
                        // Track the mouse position only during a transition
                        if (inTransition) {
                            mouseX = d3.event.clientX;
                            mouseY = d3.event.clientY;
                        }
                    })
                    .append("g")
                        .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");
        
        // Time formatting
        var timeFormat = d3.time.format("%Y");
        
        // Years
        var years = [ "1965", "1970", "1975", "1980", "1985", "1990", "1995", "2000", "2005", "2010", "2015" ];

        // Genres
        var genres = [ "Pop", "Hip-Hop/Rap", "R&B/Soul", "Rock", "Country" ];
    
        // X scale
        var xScale = d3.scale.ordinal()
                            .rangeRoundBands([0, width], 0.05);
    
        // Y scale
        var yScale = d3.scale.ordinal()
                            .domain([1, 2, 3, 4, 5])
                            .rangeRoundBands([0, height], 0.05);    

        // Color scale
        var colorScale = d3.scale.ordinal()
                                .domain(genres)
                                .range([colors.blue, colors.orange, colors.green, colors.purple, colors.red]);
    
        // When a song preview is finished, let's remove the 
        // stop icon and show the play icon instead
        ns.previewFinished = function() {

            d3.select('#audioIcon').classed('hidden', true);

            if (focusedSquare != null && playingSquare == focusedSquare) {

                d3.select("#dummyIcon").classed("hidden", false);
            }

            playingSquare = null;
        }
        
        // Shows the specified square's play icon and popover
        function showSquareDetails(ele) {
            
            var d = d3.select(ele)[0][0].__data__;
            
            // Make sure that the square is the correct genre
            // And if not, don't focus it..
            if (selectedGenre != "all") {
                if (d3.select(ele)[0][0].__data__.Genre != selectedGenre) {
                    // focusedSquare = null;
                    return null;
                }
            }
            
            // Show mouse pointer
            d3.select(ele).style("display", "block")
                                .style("cursor", "pointer");  
            
            
            // Show the tooltip if not already
            if(!$('.popover').hasClass('in')) {
                
                $(ele).popover('show');
                
                $(ele).on('shown.bs.popover', function() {
                    
                    $(this).off('shown.bs.popover');
                    
                    // This fixes a bug where the tooltip doesn't appear correctly..
                    // Specifically when you are quickly entering a square
                    if (this == focusedSquare && !$('.popover').hasClass('in')) {
                        $(this).popover('show');
                    }
                });
            }
            
            // Position the play icon accordingly
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
            
            // If the square is not playing, then show the play icon
            if (playingSquare != ele) {
                speaker.classed("hidden", false)
                    .style("left", xPos + "px")
                    .style("top", yPos + "px");
            } else { 
                // Otherwise, hide the play icon but still position it
                speaker.classed("hidden", true)
                    .style("left", xPos + "px")
                    .style("top", yPos + "px"); 
            }
            
            // Lastly, focus the element
            focusedSquare = ele;
        }
        
        
        // Called at the end of a transition
        function selectHoveredSquare() {
            
            var element = document.elementFromPoint(mouseX, mouseY);
               
            // Make sure the element is not null
            if (element != null) {

                var sEle = d3.select(element)[0][0];

                if (sEle != null && sEle.className != null && sEle.className.baseVal != null) {

                    if (sEle.className.baseVal == "square") {

                        focusedSquare = element;
                        showSquareDetails(focusedSquare);
                    }
                }
            }
        }
        // Transition callback function
        function transCB(transition, callback) { 
            
            inTransition = true;
            if (transition.size() == 0) {
                callback();
                return null;
            }
            
            var n = 0; 
            transition 
                .each(function() { ++n; }) 
                .each("end", function() {
                    if (!--n) {
                        
                        inTransition = false;
                        
                        ////
                        
                        selectHoveredSquare();
                        callback.apply(this, arguments);
                    }
                });
        }
    
        // This function repositions the stop icon (if necessary)
        function repositionStop() {
            
            if (playingSquare == null) {
                 return null;
            }
            
            // Show stop icon for good measure
            d3.select("#audioIcon").classed("hidden", false);
            
            var matrix = playingSquare.getScreenCTM()
                                .translate(+playingSquare.getAttribute("x"), +playingSquare.getAttribute("y"));
            
            var iWidth = playingSquare.getAttribute("width");
            var iHeight = playingSquare.getAttribute("height");
            
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
                showSquareDetails(focusedSquare);
            }
        }
    
        // Shows popularity (when enabled)
        function showPopularity(slide) {
            
            // We are not focusing any square since a button 
            // was just pressed (pre-condition)
            focusedSquare = null;
            
            // Initially, do not have a current year
            // This is used to grab the rank mapping array
            var currYear = "";
            // Array that maps rank to number of songs position
            // Index+1 is rank, mapArr[rank] is # of songs position
            var mapArr = [];
            
            // Y-axis business
            yScale.rangeBands([height, 0], 0.05); 
            yGroup.call(yAxis);
            yText.text("Number of songs");
            
            // Did we just toggle "Show Popularity"?
            if (slide) {
                
                svg.selectAll(".square")
                    .style("cursor", function(d) {
                        if (d.Genre == selectedGenre) {
                            return "pointer";
                        }
                        return "default";
                    }).style("fill", function(d) {
                        if (d.Genre == selectedGenre) {
                            this.setAttribute('noPlay', 0);
                            return colorScale(selectedGenre);
                        }
                        this.setAttribute('noPlay', 1);
                        return colors.gray;
                    }).interrupt().transition()
                    .duration(750)
                    .call(transCB, function() {
                        
                        repositionStop();
                    })
                    .attr("y", function(d, i) {

                        if (currYear != d.Year) {
                            currYear = d.Year;
                            mapArr = mapData[currYear][selectedGenre];
                        }
                        
                        return yScale(mapArr[d.Rank - 1]);
                    });
            } else {
                svg.selectAll(".square")
                    .style("fill", function() {
                        this.setAttribute('noPlay', 1);
                        return colors.gray;
                    })
                    .attr("y", function(d, i) {
                        
                        if (currYear != d.Year) {
                            currYear = d.Year;
                            mapArr = mapData[currYear][selectedGenre];
                        }

                        return yScale(mapArr[d.Rank - 1]);
                    })
                    .interrupt().transition()
                        .call(transCB, function() {})
                        .style("fill", function(d, i) {
                            if (d.Genre == selectedGenre) {
                                this.setAttribute('noPlay', 0);
                                return colorScale(selectedGenre);
                            }
                            this.setAttribute('noPlay', 1);
                            return colors.gray;
                        });
                    
                    repositionStop();
            }
        }
        
        // Read the JSON file
        d3.json("popular_music.json", function(data) {
            
            // Set the xScale domain
            xScale.domain(data.years.map(function(d) { return timeFormat.parse(d.year); }));

            // This will be our main data array
            // Contains all song details (title, artist, year, and rank)
            var songArr = [];
            
            // For each year..
            for (var i = 0; i < data.years.length; i++) {
                
                var year = data.years[i].year;
                
                mapData[year] = { "Pop": [], "Hip-Hop/Rap": [], "R&B/Soul": [], "Country": [], "Rock": [] };
                numYearGenre[year] = { "Pop": 0, "Hip-Hop/Rap": 0, "R&B/Soul": 0, "Country": 0, "Rock": 0 };
                
                // For each genre..
                genres.forEach(function(gr) {
                    
                    // Set the rank to number of songs position array
                    var arr = data.years[i].popularity.Genre[gr];
                    mapData[year][gr] = ( arr != null ? arr : [5, 4, 3, 2, 1] );
                });
                
                // Loop through each song and set the year and rank
                for (var j = 0; j < data.years[i].songs.length; j++) {
                    
                    var obj = data.years[i].songs[j];
                    
                    numYearGenre[year][obj.Genre] = numYearGenre[year][obj.Genre] + 1;
                    
                    obj["Year"] = year;
                    obj["Rank"] = j + 1;
                    
                    songArr.push(obj);
                }
            }
            
            
            // X-axis
            var xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("bottom")
                .tickFormat(timeFormat);

            // Y-axis
            yAxis = d3.svg.axis()
                .scale(yScale)
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

            // Create all of the song squares
            var squares = svg.selectAll(".square")
                .data(songArr)
                .enter()
                .append("rect")
                    .attr("x", function(d) { return xScale(timeFormat.parse(d.Year)); })
                    .attr("y", function(d) { return yScale(d.Rank); })
                    .attr("rx", 2)
                    .attr("ry", 2)
                    .attr("class", "square")
                    .attr("width", xScale.rangeBand())
                    .attr("height", yScale.rangeBand())
                    .style("fill", function(d) { 
                        
                        this.setAttribute('noPlay', 1);
                        return colors.gray;
                    } )
                    .each(function(d, i){
                        
                        // Popover (tooltip)
                        $(this).popover({
                            container: 'body',
                            placement : function (tooltip, ele) {
                                
                                // This code fixes the popover position when scrolling
                                // I tried many approaches, but finally landed on this
                                setTimeout(function() {
                                
                                    // This is a small fix to when the user is scrolling
                                    // Though, the visualization is meant to be viewed without scrolling
                                    var scrollTop = $(document).scrollTop();
                                    var scrollLeft = $(document).scrollLeft();
                                    
                                    if (scrollTop != 0 || scrollLeft != 0) {

                                        scrollTop = $(document).scrollTop();
                                        scrollLeft = $(document).scrollLeft();

                                        if (!(scrollTop == 0 && scrollLeft == 0) && focusedSquare == ele) {
                                            
                                            function fixPosition() {
                                                
                                                // Position the play icon accordingly
                                                var matrix = ele.getScreenCTM()
                                                                .translate(+ ele.getAttribute("x"), + ele.getAttribute("y"));

                                                var iWidth = +ele.getAttribute("width");
                                                var iHeight = +ele.getAttribute("height");

                                                var popover = $(".popover");

                                                var xPos = window.pageXOffset + matrix.e;
                                                var yPos = window.pageYOffset + matrix.f + iHeight/2 - popover.outerHeight()/2;

                                                var year = d3.select(ele)[0][0].__data__.Year;

                                                if (year < 1995) {
                                                    xPos = xPos + Math.floor(iWidth);
                                                } else {
                                                    xPos = xPos - popover.width();
                                                }

                                                popover.css({ top: yPos + "px", left: xPos + "px" });

                                                $('.popover.left .arrow').css('top', popover.outerHeight()/2);
                                                $('.popover.right .arrow').css('top', popover.outerHeight()/2);
                                            }
                                            
                                            fixPosition();
                                            
                                            // This makes sure the popover is correctly placed
                                            // Necessary, as sometimes the position doesn't adjust fully
                                            $(ele).on('shown.bs.popover', function() {
                                                
                                                $(this).off('shown.bs.popover');
                                                
                                                // Wait before repositioning
                                                setTimeout(function() {
                                                    
                                                    scrollTop = $(document).scrollTop();
                                                    scrollLeft = $(document).scrollLeft();

                                                    if (!(scrollTop == 0 && scrollLeft == 0) && focusedSquare == ele) {
                                                        
                                                        if(!$('.popover').hasClass('in')) {
                                                            
                                                            $(ele).popover("show");
                                                        }
                                                    }
                                                }, 250);
                                            });
                                        }
                                    }
                                }, 0);
                                
                                return +d.Year < 1995 ? "right" : "left";
                            },
                            delay: { "show": 100, "hide": 100 },
                            trigger: 'manual',
                            html : true,
                            content: function() {
                                return '<div class="media"><a href="#" class="pull-left"><img src="' + songDetail[d.Title].cover + '" width="120px" height="120px" class="media-object"/></a><div class="media-body"><h4 class="display-1">' + d.Title + '</h4><h5>' + d.Artist + '</h5><hr><h6>Year: ' + d.Year + '<br/>Genre: ' + d.Genre + '<br/>Rank: ' + d.Rank + '</h6></div></div>';
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
                        if (this.getAttribute("noPlay") == 1) {
                            
                            // 'this' is the reference to this square
                            // And should be focused if applicable
                            showAllGenres(this);
                            return null;
                        }

                        // Grab the song preview URL
                        var URL = songDetail[d.Title].preview;
                        // Grab the player
                        var player = d3.select("#player");

                        // If this square is playing..
                        if (playingSquare == this) {

                            // Stop playing
                            playingSquare = null;

                            // Hide the stop icon
                            d3.select("#audioIcon")
                                .classed("hidden", true);

                            // Show the play icon
                            d3.select("#dummyIcon")
                                .classed("hidden", false);

                            // Set the player's source to nothing
                            player.attr("src", "");
                            // Reset the player's seek time
                            document.getElementById('player').currentTime = 0;
                        } else {
                            // Otherwise, let's play the song for this square
                            playingSquare = this;

                            // Hide the play icon
                            d3.select("#dummyIcon")
                                .classed("hidden", true);

                            // Position the stop icon
                            repositionStop();

                            // Set the player's source
                            player.attr("src", URL);
                            
                            // Finally, play the audio
                            document.getElementById('player').play();
                        }
                    })
                    .on("mouseover", function(d) {
                        
                        var ele = d3.select(this);

                        // If grayed out, then hide the cursor hand and popover
                        if (this.getAttribute("noPlay") == 1 || songDetail[d.Title] == null) {

                            ele.style("cursor", "default");
                            $(this).popover('hide');

                            return null;
                        }

                        // If our genre is not the selected genre, return
                        if (selectedGenre != "all") {
                            if (d3.select(this)[0][0].__data__.Genre != selectedGenre) {
                                return null;
                            }
                        }
                        
                        // Focus this square
                        focusedSquare = this;

                        // Show the square details if we are not in a transition
                        if (!inTransition) {
                            showSquareDetails(this);
                        }
                    })
                    .on("mouseout", function() {
                        
                        // No square is being focused right now
                        focusedSquare = null;
                        
                        // Set the cursor to default
                        d3.select(this).style("cursor", "default");

                        // Hide the play icon and popover
                        d3.select("#dummyIcon").classed("hidden", true);
                        $(this).popover('hide');
                    });
            
            // URL Processing
            
            var cacheTotal = 0;
            
            // For each song, collect the proper URLs
            songArr.forEach(function(d) {
                
                // Replace spaces with '+' for artist and title
                var artist = d.Artist.replace(/ /g, '+');
                var title = d.Title.replace(/ /g, '+');
                
                // If there is a featured artist, chop their name off
                if (d.Artist.indexOf("feat.") != -1) {
                    artist = d.Artist.substring(0, d.Artist.indexOf("feat.")-1).replace(/ /g, '+');
                }
                
                // HTTP request
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.onreadystatechange = function() {
                    
                    // On request completion..
                    if (xmlhttp.readyState == 4) {
                        
                        // If track total is 0, then there is no song data
                        if (JSON.parse(xmlhttp.responseText).tracks.total == 0) {
                            // This is the one exemption where Spotify does not 
                            // have the track
                            if (d.Title == "Nothing Compares 2 U") {
                                songDetail[d.Title] = { preview: "https://upload.wikimedia.org/wikipedia/en/2/22/Nothing_Compares_2_U_sample.ogg", cover: "https://upload.wikimedia.org/wikipedia/en/e/e6/Nothingcompares2u.jpg" };
                            } else { // Otherwise we don't have this song's information..
                               songDetail[d.Title] = { preview: "", cover: "" }; 
                            }
                        } else {
                            var json = JSON.parse(xmlhttp.responseText);

                            // Grab both URLs for the preview and album covers
                            var previewURL = json.tracks.items[0].preview_url;
                            var imgURL = json.tracks.items[0].album.images[0].url;

                            songDetail[d.Title] = { preview: previewURL, cover: imgURL };
                        }
                        
                        // Another song processed
                        cacheTotal = cacheTotal + 1;
                        document.title = Math.floor( (cacheTotal/55) * 100 ) + "%";
                        
                        // If we have reached our total, then color the squares.
                        if (cacheTotal >= 55) {
                            
                            document.title = "Popular Music and Genres over Half a Century";
                            
                            d3.selectAll(".square")
                                .transition()
                                    .call(transCB, function() {})
                                    .delay(function(d, i) {
                                        return i * 15;
                                    })
                                    .duration(200)
                                    .style("fill", function(d, i) {
                                        this.setAttribute('noPlay', 0);
                                        return colorScale(d.Genre);
                                    });
                        }
                    }
                }
                
                // The actual HTTP GET request
                xmlhttp.open("GET", "https://api.spotify.com/v1/search?q=artist:" + artist + "+title:" + title + "&type=track&limit=1", true);
                xmlhttp.send(null);
            });
        });
        
        // On window resize, reposition the stop icon and popover
        $(window).resize(function() {
            
            repositionStop();
            
            if (focusedSquare != null) {
                
                showSquareDetails(focusedSquare);
            }
        });
        
        // This repositions the stop icon when scrolling horiz.
        var recentScrollLeft = 0;
        
        $("#mainDiv").scroll(function() {
            
            var scrollLeft = $("#mainDiv").scrollLeft();
            
            if (recentScrollLeft != scrollLeft) {
                
                repositionStop();
                
                // Focus no square
                focusedSquare = null;
                
                // Hide the play icon and popover
                d3.select("#dummyIcon").classed("hidden", true);
                $(".popover").popover('hide');
                
                recentScrollLeft = scrollLeft;
            }
        });
        
        // This function converts the number of songs position 
        // to the rank position of a particular square
        function getCorrRank(element) {
            
            var data = d3.select(element)[0][0].__data__;

            var yr = data.Year;
            var rank = data.Rank;
            
            // The math is pretty much inverting the number line 
            // to get the correct rank number
            var arr = mapData[yr][selectedGenre];
            var soughtRank = (5-arr[rank-1]+1);
            
            return { rank: soughtRank, year: yr, equal: (soughtRank == rank) };
        }
        
        // This function converts the rank to the number of songs position 
        // for a particular square
        function getCorrNum(element) {
            
            var data = d3.select(element)[0][0].__data__;
            var rank = data.Rank;
            
            var arr = mapData[data.Year][selectedGenre];
            var soughtNum = arr[rank-1];
            
            return { num: soughtNum, equal: (soughtNum == (5-rank+1)) };
        }
    
        // Draw legend
        
        var lW = 145;
        var lH = 180;

        var pX = width + 25;
        var pY = height - lH - 30 - 5;
        
        // Show popularity button
        var pButton = svg.append("rect")
                        .attr("x", pX)
                        .attr("y", pY - 35)
                        .attr("width", lW)
                        .attr("height", 30)
                        .attr("fill", colors.lightgray)
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
                                
                                // Do not allow during a transition
                                if (inTransition) {
                                    
                                    return null;
                                }
                                
                                // Set focused square to null
                                focusedSquare = null;
                                
                                // Toggle popularity
                                togglePopularity = !togglePopularity;
                                
                                if (togglePopularity) {
                                    
                                    // Color the button green
                                    pButton.style("fill", colors.lightgreen);
                                    
                                    if (playingSquare != null) {
                                        var equal = getCorrNum(playingSquare).equal;
                                        
                                        // If our square is going to move, hide the stop icon 
                                        if (!equal) {
                                            d3.select("#audioIcon").classed("hidden", true);
                                        }
                                    }
                                    
                                    // The parameter is for the slide animation
                                    showPopularity(true);
                                } else {
                                    
                                    // Color the button gray
                                    pButton.style("fill", colors.gray);
                                    
                                    if (playingSquare != null) {
                                        var equal = getCorrRank(playingSquare).equal;
                                        
                                        // If our square is going to move, hide the stop icon
                                        if (!equal) {
                                            d3.select("#audioIcon").classed("hidden", true);
                                        }
                                    }
                                    
                                    // Show rank
                                    yText.text("Rank");
                                    yScale.rangeBands([0, height], 0.05); 
                                    yGroup.call(yAxis);
                                    
                                    // Hide the play icon
                                    d3.select("#dummyIcon").classed("hidden", true);
                                    
                                    // Transition the squares to their rank positions.
                                    svg.selectAll(".square")
                                        .interrupt().transition()
                                        .duration(750)
                                        .call(transCB, function() {

                                            repositionStop();
                                        })
                                        .style("fill", function(d) {
                                            if (d.Genre == selectedGenre) {
                                                
                                                this.setAttribute('noPlay', 0);
                                                return colorScale(selectedGenre);
                                            }
                                            
                                            this.setAttribute('noPlay', 1);
                                            return colors.gray;
                                        })
                                        .attr("y", function(d) {

                                           return yScale(d.Rank); 
                                        });
                                }
                            })
                            .classed("hidden", true); // Initially hide the button
        

        var pText = svg.append("text")
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
        
        // Stops the audio player
        function stopPlayer() {
            
            playingSquare = null;
            
            d3.select("#audioIcon")
                .classed("hidden", true);

            d3.select("#player").attr("src", "");
            document.getElementById('player').currentTime = 0;
        }
        
        // This function shows all the squares
        function showAllGenres(ref) {
            
            // Do not trigger during a transition
            if (inTransition) {
                
                return null;
            }
            
            // If all squares are already shown, then return
            if (selectedGenre == "all") {
                return null;
            }
            
            // If we are showing popularity and the stop icon is visible
            if (togglePopularity && playingSquare != null) {
                
                var equal = getCorrRank(playingSquare).equal;
                
                // If the sought after rank is not equal to 
                // the playingSquare rank, then the square needs to move
                if (!equal) {
                    d3.select("#audioIcon").classed("hidden", true);
                }
            }
            
            // We are not focusing any square right now
            focusedSquare = null;
            
            // Ref would not be null in the case if the user 
            // clicks on a gray square
            if (ref != null) {
                
                if (togglePopularity) {
                    
                    var result = getCorrRank(ref);

                    var year = result.year;
                    var soughtRank = result.rank;

                    // We then loop through to get the correct square..
                    svg.selectAll(".square").filter(function(d) {

                        if (focusedSquare == null && d.Year == year && d.Rank == soughtRank) {

                            focusedSquare = this;
                        }
                    });
                } else {
                    
                    focusedSquare = ref;
                }
            }
            
            // Now, set the selected genre to all
            // We had to wait to process the above code properly
            selectedGenre = "all";
            
            // Y-axis business
            yScale.rangeBands([0, height], 0.05); 
            yGroup.call(yAxis);
            yText.text("Rank");
            
            // Hide popularity button and text
            pButton.classed("hidden", true);
            pText.classed("hidden", true);
            
            // Reposition stop icon and re-color squares
            svg.selectAll(".square")
                .interrupt().transition()
                .duration(750)
                .call(transCB, function() {
                    
                    repositionStop();
                    
                    if (focusedSquare != null) {
                        // Show tooltip
                        $(focusedSquare).popover('show');
                        // Show dummy play icon
                        showSquareDetails(focusedSquare);
                    }
                })
                .attr("y", function(d, i) {
                    return yScale(d.Rank);
                })
                .style("fill", function(d) {
                    this.setAttribute('noPlay', 0);
                    return colorScale(d.Genre);
                });
        }
        
        svg.append("rect")
            .attr("x", lX)
            .attr("y", lY - 35)
            .attr("width", lW)
            .attr("height", 30)
            .attr("fill", colors.lightgray)
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

        svg.append("rect")
            .attr("x", lX)
            .attr("y", lY)
            .attr("width", lW)
            .attr("height", lH)
            .attr("fill", colors.lightgray)
            .style("stroke", "black")
            .style("stroke-size", "2px");

        var legendScale = d3.scale.ordinal()
                            .domain(genres)
                            .rangeBands([0, lH], 0.2);    

        var legendG = svg.selectAll(".legendRect")
                        .data(genres)
                        .enter()
                        .append("g");
        
        // Genre clickable squares for the legend
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
            
            // Do not allow clicks during transitions
            // This avoids lots of potential bugs
            if (inTransition) {
                return null;
            }
            
            // We are not focusing any square right now
            focusedSquare = null;
            
            if (selectedGenre == genre) {
                
                showAllGenres();
            } else {
                selectedGenre = genre;
                
                // Stop the player if a different genre is selected
                if (playingSquare != null && d3.select(playingSquare)[0][0].__data__.Genre != genre) {

                    stopPlayer();
                }
                
                // Show popularity button and text
                pButton.classed("hidden", false);
                pText.classed("hidden", false);
                
                // If "Show Popularity" is enabled, then show popularity
                if (togglePopularity) {
                    
                    showPopularity();
                } else {
                    
                    // Otherwise, let's just fill the squares
                    svg.selectAll(".square")
                        .transition()
                        .call(transCB, function() {

                            d3.select("#dummyIcon").classed("hidden", true);

                            if (focusedSquare != null) {

                                showSquareDetails(focusedSquare);
                            }
                        })
                        .style("fill", function(d) {
                            if (d.Genre == genre) {
                                this.setAttribute('noPlay', 0);
                                return colorScale(genre);
                            }
                            
                            this.setAttribute('noPlay', 1);
                            return colors.gray;
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