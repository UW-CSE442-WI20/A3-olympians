///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
// DATA INITIALIZATION
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

const d3 = require("d3");
const _ = require("underscore");
// const timeslider = require("./timeslider");
// const medalslider = require("./medalslider");
// const olympicamountslider = require("./olympicamountslider");
// const generateAthleteChart = require("./athletechart");
// import {
//   timeslider
// } from './timeslider';
// import {
//   medalslider
// } from './medalslider';
// import {
//   olympicamountslider
// } from './olympicamountslider';
// import {
//   generateAthleteChart
// } from './athletechart';
const generateAthleteChart = require("./athletechart");

var {
  outerWidth,
  outerHeight,
  margin,
  innerWidth,
  innerHeight,
  circleRadius,
  xColumn,
  yColumn,
  colorColumn,
  startYear,
  endYear,

  minOrder,
  maxOrder,
  // csvFile,

  medalCounts,
  medalRange,
  olympicAmountCounts,
  olympicAmountRange,
  selectedValues,
  peopleNames,
  // data structures to be loaded in

  // make the Name the key
  entriesByName,
  // make the NOC the key
  entriesByNOC,
  // make the Start Year the key then Name the secondary key
  entriesByStartThenName,
  // lists all NOCs
  NOCs,

  xScale,
  yScale,
  colorScale,
  // get the svg
  svg,
  smallsvg,
  // for plotting points
  xValue,

  // axes
  xAxis,
  yAxis,

  // add axis groups to svg
  xAxisGroup,
  yAxisGroup,

  // define clipping path so that drawing stays within the chart
  // while using the timeslider
  clippath,

  // add group for the visualization
  chart
} = require('./globals');
// import {
//   redraw,
//   redrawWithAnimation
// } from './canvas';
const {redraw, redrawWithAnimation} = require( './canvas');

const csvFile = require('../data/olympic_overall.csv');

const NOCtoCountry = [];

NOCtoCountry.push(
  {key:"ANZ", value:"Australasia"},
  {key:"ARG", value:"Argentina"},
  {key:"AUS", value:"Australia"},
  {key:"AUT", value:"Austria"},
  {key:"BEL", value:"Belgium"},
  {key:"BLR", value:"Belarus"},
  {key:"BRA", value:"Brazil"},
  {key:"BUL", value:"Bulgaria"},
  {key:"CAN", value:"Canada"},
  {key:"CHN", value:"China"},
  {key:"CRC", value:"Costa Rica"},
  {key:"CRO", value:"Croatia"},
  {key:"CUB", value:"Cuba"},
  {key:"DEN", value:"Denmark"},
  {key:"ESP", value:"Spain"},
  {key:"EUN", value:"Unified Team"},
  {key:"FIN", value:"Finland"},
  {key:"FRA", value:"France"},
  {key:"GBR", value:"Great Britain"},
  {key:"GER", value:"Germany"},
  {key:"GRE", value:"Greece"},
  {key:"HUN", value:"Hungary"},
  {key:"IRL", value:"Ireland"},
  {key:"ITA", value:"Italy"},
  {key:"JPN", value:"Japan"},
  {key:"KAZ", value:"Kazakhstan"},
  {key:"KGZ", value:"Kyrgyzstan"},
  {key:"KOR", value:"South Korea"},
  {key:"LTU", value:"Lithuania"},
  {key:"MEX", value:"Mexico"},
  {key:"NED", value:"Netherlands"},
  {key:"NOR", value:"Norway"},
  {key:"NZL", value:"New Zealand"},
  {key:"PHI", value:"Philippines"},
  {key:"POL", value:"Poland"},
  {key:"ROU", value:"Romania"},
  {key:"RSA", value:"South Africa"},
  {key:"RUS", value:"Russia"},
  {key:"SCG", value:"Serbia and Montenegro"},
  {key:"SGP", value:"Singapore"},
  {key:"SLO", value:"Slovenia"},
  {key:"SRB", value:"Serbia"},
  {key:"SUI", value:"Switzerland"},
  {key:"SUR", value:"Suriname"},
  {key:"SVK", value:"Slovakia"},
  {key:"SWE", value:"Sweden"},
  {key:"TCH", value:"Czechoslovakia"},
  {key:"TTO", value:"Trinidad and Tobago"},
  {key:"TUN", value:"Tunisia"},
  {key:"UKR", value:"Ukraine"},
  {key:"URS", value:"Soviet Union"},
  {key:"USA", value:"United States"},
  {key:"VEN", value:"Venezuela"},
  {key:"YUG", value:"Yugoslavia"},
  {key:"ZIM", value:"Zimbabwe"}
);

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
// Helper functions
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

// function to set up the nested data structures
function initializeDataStructures(data) {
  // convert each value to its appropriate data type
  data.forEach(function(d) {
    d.ID = +d.ID;
    d.Age = +d.Age;
    d.Year = +d.Year;
    d.Order = +d.Order;
  });

  // make the name the key
  entriesByName = d3.nest()
    .key(function(d) {
      return d.Name;
    })
    .entries(data);

  // make the NOC the key
  entriesByNOC = d3.nest()
    .key(function(d) {
      return d.NOC;
    })
    .entries(data);

  // make the Start Year the key then Name the secondary key
  entriesByStartThenName = d3.nest()
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
  medalCounts = _.countBy(medalsOnly, function(item) {
    return item.Name;
  });


  const uniqueYears = _.uniq(data, function(item) {
    return item.Name + " " + item.Year;
  })

  olympicAmountCounts = _.countBy(uniqueYears, function(item) {
    return item.Name;
  })
}


function setupNOCFiltering(data) {

  // for (var key in entriesByNOC) {
  //   if (!(entriesByNOC[key] in NOCs)) {
  //     NOCs.push(entriesByNOC[key].key);
  //   }
  // }

  NOCtoCountry.forEach(function(item) {
    NOCs.push(item.value + " (" + item.key + ")");
  })

  var select = document.getElementById("select-NOC");
  for (var index in NOCs) {
    select.options[select.options.length] = new Option(NOCs[index], index);
  }

  document.getElementById('select-NOC').addEventListener('change', function() {
    var activities = document.getElementById('select-NOC');
    var selectedOptions = activities.selectedOptions || [].filter.call(activities.options, option => option.selected);
    selectedValues = [].map.call(selectedOptions, option => option.value);
    //var medals = document.getElementById('numMedals').value;

    // want all to fade and only the ones that remain to stay
    chart.selectAll("line")
      .transition()
      .style("opacity", 0)
      .remove();

    chart.selectAll("circle")
      .transition()
      .delay(200)
      .duration(1000)
      .ease(d3.easeQuadIn)
      .attr("cx", function(d) {
        // return xScale(d[xColumn]);
        return xScale((maxOrder + minOrder) / 2);
      })
      .attr("cy", function(d) {
        return yScale(d[yColumn]);
      })
      .attr("r", circleRadius)
      .attr("fill", "grey")
      .on("end",function() { // on end of transition...
				    d3.select(this)
				    	.transition() // second transition
							.delay(750) // second delay
              .duration(1000)
              .style("opacity", 0)
				});

    maxOrder = -Number.MAX_VALUE;
    minOrder = Number.MAX_VALUE;

    for (var i = 0; i < selectedValues.length; i++) {
      var athleteMinOrder = _.min(entriesByNOC[selectedValues[i]].values, function(item) {
        return item.Order;
      });
      var athleteMaxOrder = _.max(entriesByNOC[selectedValues[i]].values, function(item) {
        return item.Order;
      });

      if (athleteMaxOrder.Order > maxOrder) {
        maxOrder = athleteMaxOrder.Order;
      }

      if (athleteMinOrder.Order < minOrder) {
        minOrder = athleteMinOrder.Order;
      }
    }

    for (var i = 0; i < selectedValues.length; i++) {
      //var filteredMedalData = filterByMedal(entriesByNOC[selectedValues[i]], medalCounts, medalRange[0], medalRange[1]);
      redrawWithAnimation(svg, smallsvg, chart, filterAll(entriesByNOC[selectedValues[i]]),
         entriesByName, xScale, yScale, colorScale, xAxis, xAxisGroup, xColumn, yColumn, colorColumn, circleRadius, minOrder, maxOrder);
    }
  });
}

// function that returns the dataset with only the rows
// containing the people with at least nMedals medals
// parameters: data - the full dataset,
// medalCounts - count of all the medals for each person
// minMedals - current min number of medals
// maxMedals - current max number of medals
function filterByMedal(data, medalCounts, minMedals, maxMedals) {
  console.log("filter by medal called with data", data);
  if (typeof data === 'undefined') {
    return undefined;
  }
  let currMedals = [];
  for (var person in medalCounts) {
    // console.log("person", person)
    if (medalCounts[person] >= minMedals && medalCounts[person] <= maxMedals) {
      currMedals.push(person);
    }
  }
  let currPeople = _.filter(data.values, (item) => {
    const hasEnoughMedals = _.indexOf(currMedals, item.Name) >= 0;
    if (hasEnoughMedals) {
      peopleNames.push(item.Name);
    } else {
        d3.selectAll(".c" + item.Name.substr(0, item.Name.indexOf(" ")))
          .transition()
          .style("opacity", 0)
          .duration(2000)
          .remove();
        d3.selectAll(".l" + item.Name.substr(0, item.Name.indexOf(" ")))
          .transition()
          .style("opacity", 0)
          .duration(2000)
          .remove();
    }
    return hasEnoughMedals;
  });
  peopleNames = _.uniq(peopleNames, false);
  currPeople = d3.nest()
    .key(function() {
      return data.key;
    })
    .entries(currPeople);
  return currPeople[0];
}

// initialize the medalslider
function initializeMedalSlider() {
  var myMedalSlider = medalslider(1, 28);
  d3.select('#medalsEventHandler')
    .on('change', function() {
      // get min and max medal medal counts
      medalRange = myMedalSlider.getRange();
      // redraw data within range selection
      peopleNames = [];
      if (typeof selectedValues !== 'undefined') {
        for (let i = 0; i < selectedValues.length; i++) {
          redraw(svg, smallsvg, chart, filterAll(entriesByNOC[selectedValues[i]]),
             entriesByName, xScale, yScale, colorScale, xAxis, xAxisGroup, xColumn, yColumn, colorColumn, circleRadius, minOrder, maxOrder);
        }
      }
    });
}

// initialize the olympicslider
function initializeOlympicAmountSlider() {
  var myOlympicAmountSlider = olympicamountslider(1, 5);
  d3.select('#olympicAmountEventHandler')
    .on('change', function() {
      // get min and max participation counts
      olympicAmountRange = myOlympicAmountSlider.getRange();
      // redraw data within range selection
      peopleNames = [];
      if (typeof selectedValues !== 'undefined') {
        for (let i = 0; i < selectedValues.length; i++) {
          redraw(svg, smallsvg, chart, filterAll(entriesByNOC[selectedValues[i]]),
             entriesByName, xScale, yScale, colorScale, xAxis, xAxisGroup, xColumn, yColumn, colorColumn, circleRadius, minOrder, maxOrder);
        }
      }
    });
}

function filterAll (data) {
  var medalsFiltered = filterByMedal(data, medalCounts, medalRange[0], medalRange[1]);
  var filterMedalsAndAmount = filterByMedal(medalsFiltered, olympicAmountCounts, olympicAmountRange[0], olympicAmountRange[1]);
  return filterMedalsAndAmount;
}


function autocomplete(input) {
  /*the autocomplete function takes two arguments,
  the text field element and an array of possible autocompleted values:*/
  var currentFocus;
  /*execute a function when someone writes in the text field:*/
  input.addEventListener("input", function(e) {
    // a is the autocomplete outer div element
    // b is the temporary variable used to store each option in the div
    var a, b, val = this.value;
    /*close any already open lists of autocompleted values*/
    closeAllLists();
    if (!val) {
      return false;
    }
    currentFocus = -1;
    /*create a DIV element that will contain the items (values):*/
    a = document.createElement("DIV");
    a.setAttribute("id", this.id + "autocomplete-list");
    a.setAttribute("class", "autocomplete-items");
    /*append the DIV element as a child of the autocomplete container:*/
    this.parentNode.appendChild(a);
    /*for each item in the array...*/
    for (var i = 0; i < peopleNames.length; i++) {
      /*check if the item starts with the same letters as the text field value:*/
      if (peopleNames[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
        /*create a DIV element for each matching element:*/
        b = document.createElement("DIV");
        /*make the matching letters bold:*/
        b.innerHTML = "<strong>" + peopleNames[i].substr(0, val.length) + "</strong>";
        b.innerHTML += peopleNames[i].substr(val.length);
        /*insert a input field that will hold the current array item's value:*/
        b.innerHTML += "<input type='hidden' value='" + peopleNames[i] + "'>";
        /*execute a function when someone clicks on the item value (DIV element):*/
        b.addEventListener("click", function(e) {
          /*insert the value for the autocomplete text field:*/
          input.value = this.getElementsByTagName("input")[0].value;
          /*close the list of autocompleted values,
          (or any other open lists of autocompleted values:*/
          closeAllLists();
          generateAthleteChart(_.find(d3.values(entriesByName), function(item) {
            return item.key === input.value;
          }).values, smallsvg);
        });
        a.appendChild(b);
      }
    }
  });
  /*execute a function presses a key on the keyboard:*/
  input.addEventListener("keydown", function(e) {
    var currSuggestion = document.getElementById(this.id + "autocomplete-list");
    if (currSuggestion) {
      currSuggestion = currSuggestion.getElementsByTagName("div");
    }
    if (e.keyCode == 40) {
      /*If the arrow DOWN key is pressed,
      increase the currentFocus variable:*/
      currentFocus++;
      /*and and make the current item more visible:*/
      addActive(currSuggestion);
    } else if (e.keyCode == 38) { //up
      /*If the arrow UP key is pressed,
      decrease the currentFocus variable:*/
      currentFocus--;
      /*and and make the current item more visible:*/
      addActive(currSuggestion);
    } else if (e.keyCode == 13) {
      /*If the ENTER key is pressed, prevent the form from being submitted,*/
      e.preventDefault();
      if (currentFocus > -1) {
        /*and simulate a click on the "active" item:*/
        if (currSuggestion) {
          currSuggestion[currentFocus].click();
        }
      }
    }
  });

  function addActive(item) {
    /*a function to classify an item as "active":*/
    if (!item) {
      return false;
    }
    /*start by removing the "active" class on all items:*/
    removeActive(item);
    if (currentFocus >= item.length) {
      currentFocus = 0;
    }
    if (currentFocus < 0) {
      currentFocus = (item.length - 1);
    }
    /*add class "autocomplete-active":*/
    item[currentFocus].classList.add("autocomplete-active");
  }

  function removeActive(item) {
    /*a function to remove the "active" class from all autocomplete items:*/
    for (var i = 0; i < item.length; i++) {
      item[i].classList.remove("autocomplete-active");
    }
  }

  function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document,
    except the one passed as an argument:*/
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != input) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }
  /*execute a function when someone clicks in the document:*/
  document.addEventListener("click", function(e) {
    closeAllLists(e.target);
  });
}

// initialize the timeslider
function initializeTimeSlider() {
  var mySlider = timeslider(1896, 2016);
  // Initial start and end years
  updateTimeSlider([1896, 2016]);
  // when the input range changes, update the start and end years
  d3.select('#timeEventHandler').on('change', function() {
    updateTimeSlider(mySlider.getRange());
  });
}

// update the chart elements based on the timeslider

// update the elements
function updateTimeSlider(range) {
  startYear = range[0];
  endYear = range[1];
  // update the Y-axis
  yScale.domain([startYear, endYear]);
  yAxisGroup.transition().call(yAxis);

  // update lines
  var l = chart.selectAll("line")
    .transition()
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
  // update circles
  var c = chart.selectAll("circle")
    .transition()
    .attr("cx", function(d) {
      return xScale(d[xColumn]);
    })
    .attr("cy", function(d) {
      return yScale(d[yColumn]);
    });
}


// function to place all setup done for filtering options
function initializeOptions(data) {
  setupNOCFiltering(data);
}

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
// TIME RANGE SLIDER
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

function timeslider(min, max) {
  var myrange = [min, max + 1];
  var slidervalues = [1896, 1900, 1904, 1908, 1912, 1916, 1920, 1924, 1928, 1932,
    1936, 1940, 1944, 1948, 1952, 1956, 1960, 1964, 1968, 1972, 1976, 1980,
    1984, 1988, 1992, 1996, 2000, 2004, 2008, 2012, 2016];
  // set width and height of slider control
  var w = 400;
  var h = 300;
  var controlMargin = {top: 140, bottom: 145, left: 40, right: 40};
  // dimensions of slider bar
  var width = w - controlMargin.left - controlMargin.right;
  var height = h - controlMargin.top - controlMargin.bottom;
  // create x scale
  var x = d3.scaleLinear()
     .domain(myrange)  // data space
     .range([0, width]);  // display space

  // create translated g
  const g = d3.select("#timeSlider svg")
    .append('g')
    .attr('transform', "translate(90,0)");

  console.log("time g", g);

  // draw background lines
  g.append('g').selectAll('line')
    .data(slidervalues) //d3.range(myrange[0], myrange[1]+1))
    .enter()
    .append('line')
    .attr('x1', d => x(d)).attr('x2', d => x(d))
    .attr('y1', 0).attr('y2', height)
    .style('stroke', '#ccc');

  // labels
  var labelL = g.append('text')
    .attr('id', 'labelleft')
    .attr('x', 0)
    .attr('y', height + 15)
    .text(myrange[0]);
  var labelR = g.append('text')
    .attr('id', 'labelright')
    .attr('x', 0)
    .attr('y', height + 15)
    .text(myrange[1]);

    // define brush
    var brush = d3.brushX()
      .extent([[0,0], [width, height]])
      .on('brush', function() {
        var s = d3.event.selection;
        var svg = d3.select('#mainsvg svg');//d3.select('svg');
        var val = s.map(d => Math.round(x.invert(d)));
        svg.node().value = determineYear(val, slidervalues);
        console.log("time svg", svg);
      // update and move labels
      labelL.attr('x', s[0])
        .text(svg.node().value[0]);
      labelR.attr('x', s[1])
        .text(svg.node().value[1]);
      // move brush handles
      handle
        .attr("display", null)
        .attr("transform", function(d, i) {
          return "translate(" + [ s[i], - height / 4] + ")"; });  // CHANGE HANDLE POSITION HERE
        // update view
        // if the view should only be updated after brushing is over,
        // move these two lines into the on('end') part below
        svg.node().dispatchEvent(new CustomEvent("input"));
        let event = new Event("change");
        timeEventHandler.dispatchEvent(event);
      });

    // append brush to g
    var gBrush = g.append("g")
        .attr("class", "brush")
        .call(brush);

    // add brush handles (from https://bl.ocks.org/Fil/2d43867ba1f36a05459c7113c7f6f98a)
    var brushResizePath = function(d) {
        var e = +(d.type == "e"),
            x = e ? 1 : -1,
            y = height / 2;
        return "M" + (.5 * x) + "," + y + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) + "V" + (2 * y - 6) +
          "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y) + "Z" + "M" + (2.5 * x) + "," + (y + 8) + "V" + (2 * y - 8) +
          "M" + (4.5 * x) + "," + (y + 8) + "V" + (2 * y - 8);
    };

    var handle = gBrush.selectAll(".handle--custom")
      .data([{type: "w"}, {type: "e"}])
      .enter().append("path")
      .attr("class", "handle--custom")
      .attr("transform", "translate(10,10)")
      .attr("stroke", "#00cdcf")
      .attr("stroke-width", 1.5)
      .attr("fill", "#00cdcf")
      .attr("cursor", "ew-resize")
      .attr("d", brushResizePath);  // the brush shape

    // override default behaviour - clicking outside of the selected area
    // will select a small piece there rather than deselecting everything
    // https://bl.ocks.org/mbostock/6498000
    gBrush.selectAll(".overlay")
      .each(function(d) { d.type = "selection"; })
      .on("mousedown touchstart", brushcentered);

    function brushcentered() {
      var dx = x(1) - x(0), // Use a fixed width when recentering.
      cx = d3.mouse(this)[0],
      x0 = cx - dx / 2,
      x1 = cx + dx / 2;
      d3.select(this.parentNode).call(brush.move, x1 > width ? [width - dx, width] : x0 < 0 ? [0, dx] : [x0, x1]);
    }

    // select entire range
    gBrush.call(brush.move, myrange.map(x));

    var getRange = function() {
      var range = d3.brushSelection(gBrush.node()).map(d => Math.round(x.invert(d)));
      range = determineYear(range, slidervalues);
      return range;
    }
    console.log("timeslider has been called", min, max);
    return {getRange: getRange}
  }

//// HELPER FUNCTION
//// Round slider value to the nearest valid Olympic year
  function determineYear(val, slidervalues) {
    // get start year
    for (let i = 0; i < slidervalues.length; i++) {
      if (Math.abs(slidervalues[i] - val[0]) <= 3) {
        val[0] = slidervalues[i];
        break;
      }
    }
    // get end year
    for (let i = 0; i < slidervalues.length; i++) {
      if (Math.abs(slidervalues[i] - val[1]) <= 3) {

        val[1] = slidervalues[i];
        break;
      }
    }
    return val;
  }

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
// CAREER SLIDER
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

function olympicamountslider(min, max) {
    var myrange = [min, max + 1];
    //var slidervalues = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,
    //  15,16,17,18,19,20,21,22,23,24,25,26,27,28];
    // set width and height of slider control
    var w = 400;
    var h = 300;
    var controlMargin = {top: 140, bottom: 145, left: 40, right: 40};
    // dimensions of slider bar
    var width = w - controlMargin.left - controlMargin.right;
    var height = h - controlMargin.top - controlMargin.bottom;
    // create x scale
    var x = d3.scaleLinear()
        .domain(myrange)  // data space
        .range([0, width]);  // display space

    // create translated g
    const g = d3.select("#olympicAmountSlider svg")
        .append('g')
        .attr('transform', "translate(90,0)");

    console.log("career g", g);

    // draw background lines
    g.append('g').selectAll('line')
        .data(d3.range(myrange[0], myrange[1] + 1))
        .enter()
        .append('line')
        .attr('x1', d => x(d)).attr('x2', d => x(d))
        .attr('y1', 0).attr('y2', height)
        .style('stroke', '#ccc')

    // labels
    var labelL = g.append('text')
        .attr('id', 'labelleft')
        .attr('x', 0)
        .attr('y', height + 15)
        .text(myrange[0]);
    var labelR = g.append('text')
        .attr('id', 'labelright')
        .attr('x', 0)
        .attr('y', height + 15)
        .text(myrange[1]);

    // define brush
    var brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on('brush', function () {
            var s = d3.event.selection;
            var svg = d3.select('svg');
            svg.node().value = s.map(d => Math.round(x.invert(d)));
            console.log("career slider svg", svg);
            //svg.node().value = determineYear(val, slidervalues);
            // update and move labels
            labelL.attr('x', s[0])
                .text(svg.node().value[0]);
            labelR.attr('x', s[1])
                .text(svg.node().value[1]);
            // move brush handles
            handle
                .attr("display", null)
                .attr("transform", function (d, i) {
                    return "translate(" + [s[i], -height / 4] + ")";
                });  // CHANGE HANDLE POSITION HERE
            svg.node().dispatchEvent(new CustomEvent("input"));
        })
        .on('end', () => {
            // update view
            // view should only be updated after brushing is over
            let event = new Event("change");
            olympicAmountEventHandler.dispatchEvent(event);
        });

    // append brush to g
    var gBrush = g.append("g")
        .attr("class", "brush")
        .call(brush);

    // add brush handles (from https://bl.ocks.org/Fil/2d43867ba1f36a05459c7113c7f6f98a)
    var brushResizePath = function (d) {
        var e = +(d.type == "e"),
            x = e ? 1 : -1,
            y = height / 2;
        return "M" + (.5 * x) + "," + y + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) + "V" + (2 * y - 6) +
            "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y) + "Z" + "M" + (2.5 * x) + "," + (y + 8) + "V" + (2 * y - 8) +
            "M" + (4.5 * x) + "," + (y + 8) + "V" + (2 * y - 8);
    };

    var handle = gBrush.selectAll(".handle--custom")
        .data([{type: "w"}, {type: "e"}])
        .enter().append("path")
        .attr("class", "handle--custom")
        .attr("transform", "translate(10,10)")
        .attr("stroke", "#00cdcf")
        .attr("stroke-width", 1.5)
        .attr("fill", "#00cdcf")
        .attr("cursor", "ew-resize")
        .attr("d", brushResizePath);  // the brush shape

    // override default behaviour - clicking outside of the selected area
    // will select a small piece there rather than deselecting everything
    // https://bl.ocks.org/mbostock/6498000
    gBrush.selectAll(".overlay")
        .each(function (d) {
            d.type = "selection";
        })
        .on("mousedown touchstart", brushcentered);

    function brushcentered() {
        var dx = x(1) - x(0), // Use a fixed width when recentering.
            cx = d3.mouse(this)[0],
            x0 = cx - dx / 2,
            x1 = cx + dx / 2;
        d3.select(this.parentNode).call(brush.move, x1 > width ? [width - dx, width] : x0 < 0 ? [0, dx] : [x0, x1]);
    }

    // select entire range
    gBrush.call(brush.move, myrange.map(x));

    var getRange = function () {
        var range = d3.brushSelection(gBrush.node()).map(d => Math.round(x.invert(d)));
        return range;
    }
    console.log("olympicamountslider called", min, max);
    return {getRange: getRange}
}

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
// MEDAL SLIDER
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

function medalslider(min, max) {
    var myrange = [min, max + 1];
    //var slidervalues = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,
    //  15,16,17,18,19,20,21,22,23,24,25,26,27,28];
    // set width and height of slider control
    var w = 400;
    var h = 300;
    var controlMargin = {top: 140, bottom: 145, left: 40, right: 40};
    // dimensions of slider bar
    var width = w - controlMargin.left - controlMargin.right;
    var height = h - controlMargin.top - controlMargin.bottom;
    // create x scale
    var x = d3.scaleLinear()
        .domain(myrange)  // data space
        .range([0, width]);  // display space

    // create translated g
    const g = d3.select("#medalSlider svg")
        .append('g')
        .attr('transform', "translate(90,0)");
    console.log("medal g", g);

    //draw background lines
    g.append('g').selectAll('line')
        .data(d3.range(myrange[0], myrange[1] + 1))
        .enter()
        .append('line')
        .attr('x1', d => x(d)).attr('x2', d => x(d))
        .attr('y1', 0).attr('y2', height)
        .style('stroke', '#ccc')

    // labels
    var labelL = g.append('text')
        .attr('id', 'labelleft')
        .attr('x', 0)
        .attr('y', height + 15)
        .text(myrange[0]);
    var labelR = g.append('text')
        .attr('id', 'labelright')
        .attr('x', 0)
        .attr('y', height + 15)
        .text(myrange[1]);

    // define brush
    var brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on('brush', function () {
            var s = d3.event.selection;
            var svg = d3.select('svg');
            svg.node().value = s.map(d => Math.round(x.invert(d)));
            console.log("medals svg", svg);
            //svg.node().value = determineYear(val, slidervalues);
            // update and move labels
            labelL.attr('x', s[0])
                .text(svg.node().value[0]);
            labelR.attr('x', s[1])
                .text(svg.node().value[1]);
            // move brush handles
            handle
                .attr("display", null)
                .attr("transform", function (d, i) {
                    return "translate(" + [s[i], -height / 4] + ")";
                });  // CHANGE HANDLE POSITION HERE
            svg.node().dispatchEvent(new CustomEvent("input"));
        })
        .on('end', () => {
            // update view
            // view should only be updated after brushing is over
            let event = new Event("change");
            medalsEventHandler.dispatchEvent(event);
        });

    // append brush to g
    var gBrush = g.append("g")
        .attr("class", "brush")
        .call(brush);

    // add brush handles (from https://bl.ocks.org/Fil/2d43867ba1f36a05459c7113c7f6f98a)
    var brushResizePath = function (d) {
        var e = +(d.type == "e"),
            x = e ? 1 : -1,
            y = height / 2;
        return "M" + (.5 * x) + "," + y + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) + "V" + (2 * y - 6) +
            "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y) + "Z" + "M" + (2.5 * x) + "," + (y + 8) + "V" + (2 * y - 8) +
            "M" + (4.5 * x) + "," + (y + 8) + "V" + (2 * y - 8);
    };

    var handle = gBrush.selectAll(".handle--custom")
        .data([{type: "w"}, {type: "e"}])
        .enter().append("path")
        .attr("class", "handle--custom")
        .attr("transform", "translate(10,10)")
        .attr("stroke", "#00cdcf")
        .attr("stroke-width", 1.5)
        .attr("fill", "#00cdcf")
        .attr("cursor", "ew-resize")
        .attr("d", brushResizePath);  // the brush shape

    // override default behaviour - clicking outside of the selected area
    // will select a small piece there rather than deselecting everything
    // https://bl.ocks.org/mbostock/6498000
    gBrush.selectAll(".overlay")
        .each(function (d) {
            d.type = "selection";
        })
        .on("mousedown touchstart", brushcentered);

    function brushcentered() {
        var dx = x(1) - x(0), // Use a fixed width when recentering.
            cx = d3.mouse(this)[0],
            x0 = cx - dx / 2,
            x1 = cx + dx / 2;
        d3.select(this.parentNode).call(brush.move, x1 > width ? [width - dx, width] : x0 < 0 ? [0, dx] : [x0, x1]);
    }

    // select entire range
    gBrush.call(brush.move, myrange.map(x));

    var getRange = function () {
        var range = d3.brushSelection(gBrush.node()).map(d => Math.round(x.invert(d)));
        return range
    }
    console.log("medalslider called", min, max);
    return {getRange: getRange};
}

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
// MAIN
//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////


d3.csv(csvFile).then(function(data) {
  // create the nested data structures
  initializeDataStructures(data);
  // initialize timeSlider
  initializeTimeSlider();
  // initialize medalSlider
  initializeMedalSlider();
 // initialize olympicSlider
  initializeOlympicAmountSlider();
  // initialize/create all the dropdowns/filters that will be shown in the view
  initializeOptions(data);
  autocomplete(document.getElementById("searchbar"));

});
