
// SVG width and height
var width = 900;
var height = 500 - 100;

// Margin
var margin = {top: 50, right: 200, bottom: 50, left: 50};

// Time formatting
var timeFormat = d3.time.format("%Y");

// Years
var years = [ "1965", "1970", "1975", "1980", "1985", "1990", "1995", "2000", "2005", "2010", "2015" ];

// Genres
var genres = [ "Pop", "Hip-Hop/Rap", "R&B/Soul", "Rock", "Country" ];

// Stack layout
var stack = d3.layout.stack();

// Currently hovered rectangle
var currElement = null;

// Selected genre (defaults to all)
var selectedGenre = "all";


// Main SVG
var svg = d3.select("#centerDiv2").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var ord = d3.scale.ordinal();

var x = d3.scale.ordinal()
            .rangeRoundBands([0, width], 0.3);

var y = d3.scale.linear()
            .range([height, 0]);

var colorScale = d3.scale.ordinal()
        .domain(genres)
        .range(["#0089ff", "#ff6200", "#00a300", "#a100c7", "rgb(206, 0, 0)"]);


var yAxisG = null;
var yAxis = null;

var yearArr = [];
var arr = [];

var layer = null;

d3.json("popular_music.json", function(data) {
    
    // This array contains the genres for each year
    yearArr = [];
    
    // Contains the number of songs per genre for each year
    var numYearGenre = {};
    
    data.years.forEach(function(obj) {
        
        var year = obj.year;
        numYearGenre[year] = { "Pop": 0, "Hip-Hop/Rap": 0, "R&B/Soul": 0, "Country": 0, "Rock": 0 };
        
        for (var j = 0; j < obj.songs.length; j++) {
            
            var song = obj.songs[j];
            numYearGenre[year][song.Genre] = numYearGenre[year][song.Genre] + 1;
        }
        
        // Sort by ascending order of number of songs
        var sortable = [];
        
        Object.keys(obj.popularity.Genre).forEach(function(genre) {
            sortable.push( { genre: genre, num: numYearGenre[year][genre] } );
        });
        sortable.sort(function(a, b) {
            return (a.num - b.num);
        });
        
        var parseTime = timeFormat.parse(year);
        yearArr[parseTime] = [];
        
        sortable.forEach(function(ob) {
            yearArr[parseTime].push(ob.genre); 
        });
    });
    
    // Contains our main data
    arr = genres.map(function(genre) {
                return data.years.map(function(d) {
                    return { genre: genre, year: d.year, x: timeFormat.parse(d.year), y: numYearGenre[d.year][genre] };
                });
        });

    // Stack the data
    arr = stack(arr);
    
    // Get the maximum y for our data
    var yStackMax = d3.max(arr, function(layer) { return d3.max(layer, function(d) { return d.y0 + d.y; }); });

    // Compute the x domain (years)
    x.domain(data.years.map(function(d) { return timeFormat.parse(d.year); }));
    
    // Compute y domain (based on the maximum y)
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
    
    // Create rectangles
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
                .each(function(d, i){
        
                    $(this).popover({

                        container: 'body',
                        placement: +d.year < 2005 ? "right" : "left",

                        delay: { "show": 250, "hide": 250 },

                        trigger: 'manual',

                        html: true,
                        content: function() {
                            return '<div class="media"><h7 class="display-1">Year: ' + d.year + '</h7><br><h7 class="display-1">Genre: ' + d.genre + '</h7><br><h7 class="display-1">Number of songs: ' + d.y + '</h7></div>';
                        }
                    });
                })
                .on("mouseover", function(d) {

                    currElement = this;

                    $('.popover').css('top', (d3.event.clientY - 40) + 'px');
                    $(this).popover('show');

                    $(this).on('shown.bs.popover', function() {

                        if(!$('.popover').hasClass('in') && currElement == this) {

                            // $('.popover').css('background-color', col);
                            $(this).popover('show');
                        }
                    });
                })
                .on("mouseout", function() {

                    currElement = null;
                    $(this).popover('hide');
                })
                .on("mousemove", function(d) {
                    $('.popover').css('top', (d3.event.clientY - 40) + 'px');
                });
});

var grouped = false;


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
        
            ord.domain(yearArr[d.x]);
            
            if (ord(d.genre) == null) {
                return x(d.x);
            }
            
            return x(d.x) + ord(d.genre);
        })
      .attr("width", function(d) {

            ord.domain(yearArr[d.x]);

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
                .attr("fill", "#e6e6e6")
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

/*legendRect.on("mouseover", function() {
    d3.select(this).style("display", "block")
        .style("cursor", "pointer");    
});

legendRect.on("mouseout", function() {
    d3.select(this).style("display", "block")
        .style("cursor", "default");    
});*/

legendRect.on("click", function(genre) {
    
    if (selectedGenre != genre) {
        
        selectedGenre = genre;
        
        /*layer.selectAll("rect")
            .transition()
            .duration(500)
            .style("opacity", function(d, i) {
                if (d.genre != genre) {
                    return 0.4;
                }
                return 1;
            })
            .attr("stroke-width", function(d) {
                if (d.genre == genre) {
                    return 2;
                }
                return 0;
            })
            .attr("stroke", "black");*/
    } else {
        
        selectedGenre = "all";
        
        /*layer.selectAll("rect")
            .transition()
            .duration(500)
            .style("opacity", function(d, i) {
                return 1;
            })
            .attr("stroke-width", function(d) {
                return 0;
            });*/
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