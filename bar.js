
/*
    Bar graph
                bar.js
*/


var width = 760;
var height = 350;


// Margin
var margin = { top: 15, right: 200, bottom: 30, left: 50 };

// Time formatting
var timeFormat = d3.time.format("%Y");

// Years
var years = [ "1965", "1970", "1975", "1980", "1985", "1990", "1995", "2000", "2005", "2010", "2015" ];

// Genres
var genres = [ "Pop", "Hip-Hop/Rap", "R&B/Soul", "Rock", "Country" ];
        
// Colors
var colors = { gray: "rgb(222, 222, 222)", 
              lightgray: "rgb(230, 230, 230)", 
              lightgreen: "#7de800", 
              blue: "#0089ff", 
              orange: "#ff6200", 
              green: "#00a300", 
              purple: "#CC00FA", 
              red: "#e80000" };

// Stack layout
var stack = d3.layout.stack();

// Currently hovered rectangle
var currElement = null;

// Selected genre (defaults to all)
var selectedGenre = "all";

// Indicates if the rectangles are grouped
var grouped = false;

// Main SVG
var svg = d3.select("#rankDiv").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Scales
var ord = d3.scale.ordinal();

var x = d3.scale.ordinal()
            .rangeRoundBands([0, width], 0.3);

var y = d3.scale.linear()
            .range([height, 0]);


// Color scale
var colorScale = d3.scale.ordinal()
                        .domain(genres)
                        .range([colors.blue, colors.orange, colors.green, colors.purple, colors.red]);


// We store these variables outside the d3.json method
// since other functions will need to access them
var yAxisG = null;
var yAxis = null;
var layer = null;


// Contains the genres for each year (in a particular order)
var genreObj = {};

// Main stacked array
var arr = [];


// Read in the JSON file
d3.json("popular_music.json", function(data) {
    
    // Contains the number of songs per genre for each year
    var numYearGenre = {};
    
    data.years.forEach(function(obj) {
        
        var year = obj.year;
        
        // Number of songs for each genre
        numYearGenre[year] = { "Pop": 0, "Hip-Hop/Rap": 0, "R&B/Soul": 0, "Country": 0, "Rock": 0 };
        
        // For each song in the given year
        for (var j = 0; j < obj.songs.length; j++) {
            
            // Select the song object
            var song = obj.songs[j];
            numYearGenre[year][song.Genre] = numYearGenre[year][song.Genre] + 1;
        }
        
        // Sort by ascending order of number of songs
        var sort = [];
        
        Object.keys(obj.popularity.Genre).forEach(function(genre) {
            sort.push( { genre: genre, num: numYearGenre[year][genre] } );
        });
        
        // Sort in ascending order (by number of songs)
        sort.sort(function(a, b) {
            return (a.num - b.num);
        });
        
        
        // Next, we need to push these genres into the year
        genreObj[year] = [];
        
        // Here, we push the genres into the array in a particular order
        // And this order is sorted by the number songs (above)
        sort.forEach(function(o) {
            genreObj[year].push(o.genre); 
        });
    });
    
    // 'arr' contains our main data
    arr =   genres.map(function(genre) {
                return data.years.map(function(d) {
                    return { x: timeFormat.parse(d.year), y: numYearGenre[d.year][genre], genre: genre, year: d.year };
                });
            });
    
    // Stack the data
    arr = stack(arr);
    
    // Get the maximum y for our data
    var yStackMax = d3.max(arr, function(layer) { return d3.max(layer, function(d) { return d.y0 + d.y; }); });
    
    // Compute the x domain (based on years)
    x.domain(data.years.map(function(d) { return timeFormat.parse(d.year); }));
    
    // Compute y domain (based on the maximum y-value)
    y.domain([0, yStackMax]);
    
    
    // Axes
    var xAxis = d3.svg.axis()
                    .scale(x)
                    .tickPadding(6)
                    .orient("bottom")
                    .tickFormat(timeFormat);
    
    yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left")
                    .tickFormat(function(d) { return d; })
                    .ticks(5);
    
    // Draw x-axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    // Draw y-axis
    yAxisG = svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    // Y-axis text
    yAxisG.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -height/2)
                .attr("dy", "-2em")
                .attr("text-anchor", "middle")
                .style("font-weight","bold")
                .style("font-size","18px")
                .text("Number of songs");
    
    // Layer class for rectangles
    layer = svg.selectAll(".layer")
        .data(arr)
            .enter().append("g")
            .attr("class", "layer");
    
    // Create the rectangles
    layer.selectAll("rect")
            .data(function(d) { return d; })
            .enter().append("rect")
                .attr("stroke", "black")
                .attr("stroke-width", 0)
                .attr("x", function(d) { return x(d.x); })
                .attr("y", function(d) { return y(d.y0 + d.y); })
                .attr("width", x.rangeBand())
                .attr("height", function(d) { return y(d.y0) - y(d.y0 + d.y); })
                .style("fill", function(d, i) { return colorScale(d.genre); })
                .each(function(d, i) {
                    $(this).popover({
                        container: 'body',
                        placement: function (tooltip, ele) {
                            
                            // Scroll left fix
                            setTimeout(function() {
                                
                                var scrollLeft = $("body").scrollLeft();
                                
                                if (scrollLeft != 0) {
                                    
                                    scrollLeft = $("body").scrollLeft();
                                    
                                    if (scrollLeft != 0 && currElement == ele) {
                                        
                                        // Position the play icon accordingly
                                        var matrix = ele.getScreenCTM()
                                                        .translate(+ ele.getAttribute("x"), + ele.getAttribute("y"));
                                        
                                        var xPos = window.pageXOffset + matrix.e;
                                        
                                        if (+d.year < 2005) {
                                            xPos += +ele.getAttribute("width");;
                                        } else {
                                            xPos -= $(".popover").outerWidth();
                                        }
                                        
                                        $(".popover").css({ left: xPos + "px" });
                                    }
                                }
                            }, 0);
                            return +d.year < 2005 ? "right" : "left";
                        },
                        delay: { "show": 250, "hide": 250 },
                        trigger: 'manual',
                        html: true,
                        content: function() {
                            return '<div class="media"><h7 class="display-1">Year: ' + d.year + '</h7><br/><h7 class="display-1">Genre: ' + d.genre + '</h7><br/><h7 class="display-1">Number of songs: ' + d.y + '</h7></div>';
                        }
                    });
                })
                .on("mouseover", function(d) {

                    currElement = this;
                    $(this).popover('show');

                    $(this).on('shown.bs.popover', function() {

                        if(!$('.popover').hasClass('in') && currElement == this) {
                            
                            $(this).popover('show');
                        }
                    });
                })
                .on("mouseout", function() {

                    currElement = null;
                    $(this).popover('hide');
                })
                .on("mousemove", function(d) {
                    
                    $('.popover').css({ top: d3.event.clientY - 40 + $("body").scrollTop() + 'px' });
                    
                    $('.popover.left .arrow').css('top', 40);
                    $('.popover.right .arrow').css('top', 40);
                });
});

// Stack the rectangles
var toStacked = function() {
    
    groupText.text("Group Genres");
    
    var yStackMax = d3.max(arr, function(layer) { return d3.max(layer, function(d) { return d.y0 + d.y; }); });
    
    y.domain([0, yStackMax]);
    yAxisG.call(yAxis);
    
    layer.selectAll("rect")
        .transition()
        .duration(500)
        .delay(function(d, i) { return i * 10; })
            .attr("y", function(d) { return y(d.y0 + d.y); })
            .attr("height", function(d) { return y(d.y0) - y(d.y0 + d.y); })
            .transition()
                .attr("x", function(d) { return x(d.x); })
                .attr("width", x.rangeBand());
}

// Group the rectangles
var toGrouped = function() {
    
    // Change button text
    groupText.text("Stack Genres");
    
    // Change y-domain and update
    y.domain([0, 4]);
    yAxisG.call(yAxis);
    
    // Set the ordinal scale to range across the x bandwidth
    ord.rangeBands([0, x.rangeBand()], 0);
    
    // Update the rectnagles' widths and x-positions
    layer.selectAll("rect")
        .transition()
        .duration(500)
        .delay(function(d, i) { return i * 10; })
            .attr("x", function(d) {
                
                // Set the domain to the genres for that year
                ord.domain(genreObj[d.year]);

                if (ord(d.genre) == null) {
                    return x(d.x);
                }
                
                // Gets the correct position for the genre
                return x(d.x) + ord(d.genre);
            })
          .attr("width", function(d) {
        
                ord.domain(genreObj[d.year]);

                if (ord(d.genre) == null) {
                    return 0;
                }

                return ord.rangeBand();
        })
        .transition()
            .attr("y", function(d) { return y(d.y); })
            .attr("height", function(d) { return height - y(d.y); });
}


// Draw legend

var lW = 145;
var lH = 180;

var lX = width + 25;
var lY = height - lH;

var button = svg.append("rect")
                .attr("class", "showButton")
                .attr("x", lX)
                .attr("y", lY - 35)
                .attr("width", lW)
                .attr("height", 30)
                .attr("fill", colors.lightgray)
                .style("stroke", "black")
                .style("stroke-size", "1px")
                    .on("mouseover", function() {
                        d3.select(this).style("display", "block")
                            .style("cursor", "pointer");    
                    })
                    .on("mouseout", function() {
                        d3.select(this).style("display", "block")
                            .style("cursor", "default");    
                    })
                    .on("click", function() {
                        
                        if (!grouped) {
                            toGrouped();
                        } else {
                            toStacked();
                        }
                        
                        grouped = !grouped;
                    });

var groupText = svg.append("text")
                    .attr("class", "legendText")
                    .attr("x", lX + lW/2)
                    .attr("y", lY - 25 + 15)
                    .attr("dy", "-0.3em")
                    .attr("text-anchor", "middle")
                    .style("font-weight","bold")
                    .style("font-size","16px")
                    .text("Group Genres");

// Legend rectangle
var rect = svg.append("rect")
                .attr("x", lX)
                .attr("y", lY)
                .attr("width", lW)
                .attr("height", lH)
                .attr("fill", colors.lightgray)
                .style("stroke", "black")
                .style("stroke-size", "2px");

// Legend scale
var legendScale = d3.scale.ordinal()
                    .domain(genres)
                    .rangeBands([0, lH], 0.2);    

// Legend group
var legendG = svg.selectAll(".legendRect")
                    .data(genres)
                    .enter()
                    .append("g");

// Small genre rectangles
var legendRect = legendG.append("rect")
                            .attr("class", "legendRect")
                            .attr("x", lX + 5)
                            .attr("y", function(d) { return lY + legendScale(d); })
                            .attr("width", legendScale.rangeBand())
                            .attr("height", legendScale.rangeBand())
                            .style("fill", function(d) { return colorScale(d); })
                            .style("stroke", "black")
                            .style("stroke-width", "1px");

// Genre text for each rectangle (on the right-hand side)
legendG.append("text")
            .attr("class", "legendText")
            .attr("x", lX + 38)
            .attr("y", function(d) { return lY + legendScale(d); })
            .attr("dy", "1.4em")
            .style("font-weight", "bold")
            .style("font-size", "14px")
            .text(function(d) { return d; });