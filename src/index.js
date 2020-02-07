const d3 = require("d3");
const _ = require("underscore");
//const timeSlider = require("./timeslider.js");
import {slider} from './timeslider';

var outerWidth = 1200;
var outerHeight = 800;

var margin = {
  left: 60,
  top: 30,
  right: 30,
  bottom: 30
};

var innerWidth = outerWidth - margin.left - margin.right;
var innerHeight = outerHeight - margin.top - margin.bottom;
var circleRadius = 3;
var xColumn = "ID";
var yColumn = "Year";
var colorColumn = "NOC"; // color of circles based on athlete NOC
var startYear = 1896;
var endYear = 2016;

//const xScale = d3.scaleLinear().domain([0, 135000]).range([margin["left"], innerWidth]);
const xScale = d3.scalePoint().range([margin["left"], innerWidth]);
const yScale = d3.scaleTime().domain([startYear, endYear]).range([margin["bottom"], innerHeight]);
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

// get the svg
var svg = d3.select('svg');
//var svg = d3.select("#vis");
// axes

// for plotting points
const xValue = d => d.ID;

var xAxis = d3.axisBottom(xScale)
  .tickPadding(30);
//.tickSize(-innerHeight);
var yAxis = d3.axisLeft(yScale)
  .tickValues([1896, 1900, 1904, 1908, 1912, 1916, 1920, 1924, 1928, 1932,
    1936, 1940, 1944, 1948, 1952, 1956, 1960, 1964, 1968, 1972, 1976, 1980,
    1984, 1988, 1992, 1996, 2000, 2004, 2008, 2012, 2016
  ])
  .tickFormat(d3.format("Y")) // d3.format("d") // gets rid of commas in the dates
  .tickSize(-innerWidth);

// add axis groups to svg
var xAxisGroup = svg.append("g")
  .attr("class", "axis x")
  .attr("transform", "translate(0," + innerHeight + ")")
  .call(xAxis);
var yAxisGroup = svg.append("g")
  .attr("class", "axis y")
  .attr("transform", "translate(" + margin["left"] + ",0)")
  .call(yAxis);


// group for the visualization
var chart = svg.append("g")
  .attr("class", "chart")
  .attr("transform", "translate(10,0)");

var NOCs = [];

// Load in the data
const csvFile = require('../olympic_overall.csv');

function redraw(inputData) {
  chart.selectAll("line").remove();
  chart.selectAll("circle").remove();
  chart.selectAll("line").data(inputData)
    .enter()
    .append("line")
    .style("stroke", function(d) {
      return colorScale(d[colorColumn]);
    })
    .style("stroke-width", 1)
    .attr("x1", function(d) {
      return xScale(d[xColumn]);
    })
    .attr("y1", function(d) {
      return yScale(d["Start"]);
    })
    .attr("x2", function(d) {
      return xScale(d[xColumn]);
    })
    .attr("y2", function(d) {
      return yScale(d["End"]);
    });
  chart.selectAll('circle').data(inputData)
    .enter()
    .append('circle')
    .attr("cx", function(d) {
      return xScale(d[xColumn]);
    })
    .attr("cy", function(d) {
      return yScale(d[yColumn]);
    })
    .attr("r", circleRadius)
    .attr("fill", function(d) {
      return colorScale(d[colorColumn]);
    })
    .attr("label", function(d) {
      return d.Name
    })
    //.attr(circleAttrs)
    .on("mouseover", function(d) {
      // circle gets bigger
      d3.select(this)
        .transition()
        .attr("r", circleRadius + 3)
        .attr("fill", "orange");
      //Get this circle's x/y values, then augment for the tooltip
      var xPosition = parseFloat(d3.select(this).attr("cx"));
      var yPosition = parseFloat(d3.select(this).attr("cy"));
      console.log("x: " + xPosition + " y: " + yPosition);
      //Create the tooltip label
      svg.append("text")
        .attr("id", "tooltip")
        .attr("x", xPosition)
        .attr("y", yPosition)
        .attr("text-anchor", "right")
        .attr("font-family", "sans-serif")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .attr("fill", "black")
        .style("pointer-events", "none")
        .text(d.Name);
    })
    .on("mouseout", function() {
      // back to small circles
      d3.select(this)
        .transition()
        .attr("r", circleRadius)
        .attr("fill", function(d) { return colorScale(d[colorColumn]); })
        .attr("fill", function(d) {
          return colorScale(d[colorColumn]);
        });
      //Remove the tooltip
      d3.select("#tooltip").remove();
    })
    .on("click", function(d) {
      // get the data for the selected athlete
      console.log(Object.values(d3.values(entriesByName)));
      var athleteData = _.find(d3.values(entriesByName), function(item) {
        // console.log("key: " + item.key);
        // console.log("searching for: " + d.Name);
        return item.key === d.Name;
      });
      console.log("result: " + athleteData.values);

      athleteData.values.forEach(function(element) {
        console.log(element);
      });
    });
}

d3.csv(csvFile).then(function(data) {
  console.log(data);
  // convert each value to its appropriate data type
  data.forEach(function(d) {
    d.ID = +d.ID;
    d.Age = +d.Age;
    d.Year = +d.Year;
  });

  // make the name the key
  var entriesByName = d3.nest()
    .key(function(d) {
      return d.Name;
    })
    .entries(data);

  // make the NOC the key
  var entriesByNOC = d3.nest()
    .key(function(d) {
      return d.NOC;
    })
    .entries(data);

  // make the Start Year the key then Name the secondary key
  var entriesByStartThenName = d3.nest()
    .key(function(d) {
      return d.Start;
    })
    .key(function(d) {
      return d.Name;
    })
    .entries(data);

  // get only rows with medal
  const medalsOnly = _.filter(data, function(item) {
    return item.Medal.length > 0;
  });
  // count all the medals for each person
  const medalCounts = _.countBy(medalsOnly, function(item) {
    return item.Name;
  });

  xScale.domain(data.map(xValue));

  console.log(entriesByName);
  console.log(entriesByStartThenName);
  console.log(entriesByNOC);

  for (var key in entriesByNOC) {
    if (!(entriesByNOC[key] in NOCs)) {
      NOCs.push(entriesByNOC[key].key);
    }
  }

  var select = document.getElementById("select-NOC");
  for (var index in NOCs) {
    select.options[select.options.length] = new Option(NOCs[index], index);
  }

  redraw(entriesByNOC[0].values);
  document.getElementById('select-NOC').addEventListener('change', function() {
    var currentNOCs = [];
    if (this.value in currentNOCs) {
      currentNOCs.pop(this.value);
    } else {
      currentNOCs.push(this.value);
    }
    console.log("values", this.value);
    console.log(currentNOCs);
  
    var currPeople = filterByMedal(data, medalCounts, document.getElementById('numMedals').value);
    currPeople = _.filter(currPeople, (item) => {
      return item.NOC === NOCs[this.value];
    });
    redraw(currPeople);
    // update the current dots that we're displaying
    console.log('You selected: ', this.value);
  });

  // find the maximum number of medals someone has
  const maxMedals = _.max(medalCounts, function(item) {
    return item;
  });
  // populate dropdown with range of medals
  var medalsDD = document.getElementById("numMedals");
  for (var i = 1; i <= maxMedals; i++) {
    medalsDD.options[medalsDD.options.length] = new Option(i, i);  
  }

  d3.select("#numMedals")
  .on("input", function() {
    const currPeople = filterByMedal(entriesByNOC[document.getElementById('select-NOC').value].values, medalCounts, this.value);
    redraw(currPeople);
  });
});

// function that returns the dataset with only the rows
// containing the people with more than nMedals medals
// parameters: data - the full dataset, 
// medalCounts - count of all the medals for each person
// nMedals - current number of medals
function filterByMedal(data, medalCounts, nMedals) {
  let currMedals = [];
  for (var person in medalCounts) {
    if (medalCounts[person] >= nMedals) {
      currMedals.push(person);
    }
  }
  const currPeople = _.filter(data, (item) => {
    return _.indexOf(currMedals, item.Name) >= 0;
  });
  return currPeople;
}

// RENDER THE TIME SLIDER
var mySlider = slider(1896, 2016);

// when the input range changes update the start and end years
d3.select('#eventHandler').on('change', function() {
  console.log("changed");
  updateTimeSlider(mySlider.getRange());
});

// Initial start and end years
updateTimeSlider([1896, 2016]);

// update the chart elements
function updateTimeSlider(range) {
  startYear = range[0];
  endYear = range[1];
  // update the Y-axis
  yScale.domain([startYear, endYear]);
  console.log("start: " + startYear);
  console.log("end: " + endYear);
  yAxisGroup.transition().call(yAxis);

  // update lines
  var l = chart.selectAll("line")
               .transition()
               .attr("x1", function(d) { return xScale(d[xColumn]); })
               .attr("y1", function(d) { return yScale(d["Start"]); })
               .attr("x2", function(d) { return xScale(d[xColumn]); })
               .attr("y2", function(d) { return yScale(d["End"]); });
  // update circles
  var c = chart.selectAll("circle")
               .transition()
               .attr("cx", function(d) { return xScale(d[xColumn]); })
               .attr("cy", function(d) { return yScale(d[yColumn]); });
  }
