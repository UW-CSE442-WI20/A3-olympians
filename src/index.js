///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
// DATA INITIALIZATION
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

const d3 = require("d3");
const _ = require("underscore");
import {
  timeslider
} from './timeslider';
import {
  medalslider
} from './medalslider';
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
import {
  redraw,
  redrawWithAnimation
} from './canvas';

const csvFile = require('../data/olympic_overall.csv');

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
// Helper functions
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

// function to set up the nested data structures
function initializeDataStructures(data) {
  console.log(data);
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

  // find the maximum number of medals someone has
  // maxMedals = _.max(medalCounts, function (item) {
  //   return item;
  // });
}


function setupNOCFiltering(data) {

  for (var key in entriesByNOC) {
    if (!(entriesByNOC[key] in NOCs)) {
      NOCs.push(entriesByNOC[key].key);
    }
  }

  var select = document.getElementById("select-NOC");
  for (var index in NOCs) {
    select.options[select.options.length] = new Option(NOCs[index], index);
  }

  document.getElementById('select-NOC').addEventListener('change', function() {
    var activities = document.getElementById('select-NOC');
    var selectedOptions = activities.selectedOptions || [].filter.call(activities.options, option => option.selected);
    selectedValues = [].map.call(selectedOptions, option => option.value);
    //var medals = document.getElementById('numMedals').value;

    chart.selectAll("line")
      .transition()
      .style("opacity", 0)
      .remove();

    chart.selectAll("circle")
      .transition()
      .delay(200)
      .duration(1000)
      .ease(d3.easeQuadIn)
      .attr("id", function(d) {
        return "c" + d.NOC;
      })
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
    peopleNames = [];
    for (var i = 0; i < selectedValues.length; i++) {
      redrawWithAnimation(svg, chart, filterByMedal(entriesByNOC[selectedValues[i]], medalCounts, medalRange[0], medalRange[1]),
         entriesByName, xScale, yScale, colorScale, xAxis, xAxisGroup, xColumn, yColumn, colorColumn, circleRadius, minOrder, maxOrder);
    }

  });
}

// function that returns the dataset with only the rows
// containing the people with more than nMedals medals
// parameters: data - the full dataset,
// medalCounts - count of all the medals for each person
// minMedals - current min number of medals
// maxMedals - current max number of medals
function filterByMedal(data, medalCounts, minMedals, maxMedals) {
  let currMedals = [];
  for (var person in medalCounts) {
    if (medalCounts[person] >= minMedals && medalCounts[person] <= maxMedals) {
      currMedals.push(person);
    }
  }
  let currPeople = _.filter(data.values, (item) => {
    const hasEnoughMedals = _.indexOf(currMedals, item.Name) >= 0;
    if (hasEnoughMedals) {
      peopleNames.push(item.Name);
    }
    return hasEnoughMedals;
  });
  peopleNames = _.uniq(peopleNames, true);
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
  medalRange = myMedalSlider.getRange();
  // minMedals = medalRange[0];
  // maxMedals = medalRange[1];
  d3.select('#medalsEventHandler')
    .on('change', function() {
      // reset
      chart.selectAll("circle").remove();
      chart.selectAll("line").remove();
      // get min and max medal medal counts
      medalRange = myMedalSlider.getRange();
      // redraw data within range selection
      if (typeof selectedValues !== 'undefined') {
        for (let i = 0; i < selectedValues.length; i++) {
          redraw(svg, chart, filterByMedal(entriesByNOC[selectedValues[i]], medalCounts, medalRange[0], medalRange[1]),
             entriesByName, xScale, yScale, colorScale, xAxis, xAxisGroup, xColumn, yColumn, colorColumn, circleRadius, minOrder, maxOrder);
        }
      }
    });
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
          }).values);
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

// function to generate individual athlete chart
// as a bar chart of medals over time
function generateAthleteChart(data) {

  const containsYear = (groups, year) => {
    return _.find(d3.values(groups), function(item) {
      return item.key === year;
    });
  }

  const getMedalCount = (medal, year) => {
    var numMedals = 0;
    data.forEach(function(item) {
      if (item.Medal === medal && item.Year === year) numMedals++;
    });
    return numMedals;
  }

  const groupData = [];
  data.forEach(function(item) {
    if (containsYear(groupData, item.Year) === undefined) groupData.push(new Object({
      key: item.Year,
      values: [{
          grpName: 'Bronze',
          grpValue: getMedalCount('Bronze', item.Year)
        },
        {
          grpName: 'Silver',
          grpValue: getMedalCount('Silver', item.Year)
        },
        {
          grpName: 'Gold',
          grpValue: getMedalCount('Gold', item.Year)
        }
      ]
    }))
  });
  console.log("group data: ", groupData);

  var smallsvg = d3.select("#small-chart");

  // ideally want to have the medals shrink to 0, update axes and redraw everything
  smallsvg.selectAll("g").transition(); //.delay(5000);
  smallsvg.selectAll("g").remove();
  smallsvg.selectAll("text").remove();
  smallsvg.selectAll("g").transition(); //.delay(5000);

  var smallWidth = 800;
  var smallHeight = 500;

  var smallMargin = {
    left: 60,
    top: 30,
    right: 30,
    bottom: 30
  };

  var innerSmallWidth = smallWidth - smallMargin.left - smallMargin.right;
  var innerSmallHeight = smallHeight - smallMargin.top - smallMargin.bottom;

  var x = d3.scaleLinear().rangeRound([0, smallWidth], 0.5);
  var y = d3.scaleLinear().rangeRound([smallHeight, 0]);

  x.domain(data.map(function(d) {
    return d.year;
  }));
  y.domain([0, d3.max(groupData, function(key) {
    return d3.max(key.values, function(d) {
      return d.grpValue;
    });
  })]);

  const xSmallScale = d3.scaleTime().domain([(+data[0].Start - 4), (+data[0].End + 4)]).range([smallMargin["left"], innerSmallWidth]);
  const ySmallScale = d3.scaleLinear().domain([10, 0]).range([smallMargin["bottom"], innerSmallHeight]);

  const getTickValues = (startTick, endTick) => {
    var values = [];
    for (var i = startTick; i <= endTick; i += 4) {
      values.push(i)
    }
    return values;
  }

  const xSmallAxis = d3.axisBottom(xSmallScale)
    .tickPadding(30)
    .tickValues(getTickValues(+data[0].Start, +data[0].End))
    .tickFormat(d3.format("Y"))
  // .tickSize(-innerSmallHeight);
  const ySmallAxis = d3.axisLeft(ySmallScale)
    .tickSize(-innerSmallWidth);

  // add title: athlete name and country
  smallsvg.append("text")
    .attr("x", smallWidth / 2)
    .attr("y", smallHeight - innerSmallHeight - 1.3 * smallMargin["top"])
    .style("text-anchor", "middle")
    .text(data[0].Name + "  (" + data[0].NOC + ")");

  // add axis groups to smallsvg
  const xSmallAxisGroup = smallsvg.append("g")
    .attr("class", "axis x")
    .attr("transform", "translate(0," + innerSmallHeight + ")")
    .call(xSmallAxis);
  const ySmallAxisGroup = smallsvg.append("g")
    .attr("class", "axis y")
    .attr("transform", "translate(" + smallMargin["left"] + ",0)")
    .call(ySmallAxis);

  var x1 = d3.scaleBand();
  var medalTypes = groupData[0].values.map(function(d) {
    return d.grpName;
  });
  x1.domain(medalTypes).rangeRound([0, 30]); //x.bandwidth()]) ;

  var slice = smallsvg.selectAll(".slice")
    .data(groupData)
    .enter().append("g")
    .attr("class", "g")
    .attr("transform", function(d) {
      return "translate(" + xSmallScale(d.key) + ",0)";
    });

  var color = d3.scaleOrdinal()
    .range(["#CD7F32", "#C0C0C0", "#D4AF37"]);

  const medalOffset = d => {

  }

  slice.selectAll("rect")
    .data(function(d) {
      return d.values;
    })
    .enter().append("rect")
    .attr("width", x1.bandwidth())
    .style("fill", function(d) {
      return color(d.grpName)
    })
    .attr("x", function(d) {
      return x1(d.grpName) - (1.5 * x1.bandwidth());
    })
    .attr("y", function(d) {
      return ySmallScale(d.grpValue)
    })
    .attr("height", function(d) {
      return innerSmallHeight - ySmallScale(d.grpValue);
    });

  // now add titles to the axes
  smallsvg.append("text")
    .attr("text-anchor", "middle") // this makes it easy to centre the text as the transform is applied to the anchor
    .attr("transform", "translate(" + (smallMargin["left"] / 2) + "," + (smallHeight / 2) + ")rotate(-90)") // text is drawn off the screen top left, move down and out and rotate
    .text("Number of Medals Won");

  smallsvg.append("text")
    .attr("text-anchor", "middle") // this makes it easy to centre the text as the transform is applied to the anchor
    .attr("transform", "translate(" + (smallWidth / 2) + "," + (smallHeight) + ")") // centre below axis
    .text("Year Competed");

  data.forEach(function(d) {
    d.year = d.Year;
    d.medal = d.Medal;
    console.log(d.Name + " -- " + d.year + ", " + d.medal);
  });


  // var innerSmallWidth = smallWidth - smallMargin.left - smallMargin.right;
  // var innerSmallHeight = smallHeight - smallMargin.top - smallMargin.bottom;
  //
  // var x = d3.scaleLinear().rangeRound([0, smallWidth], 0.5);
  // var y = d3.scaleLinear().rangeRound([smallHeight, 0]);
  //
  // x.domain(data.map(function(d) { return d.year; }));
  // y.domain([0, d3.max(groupData, function(key) { return d3.max(key.values, function(d) { return d.grpValue; }); })]);
  //
  // const xSmallScale = d3.scaleTime().domain([(+data[0].Start - 4), (+data[0].End + 4)]).range([smallMargin["left"], innerSmallWidth]);
  // const ySmallScale = d3.scaleLinear().domain([10,0]).range([smallMargin["bottom"], innerSmallHeight]);
  //
  // const getTickValues = (startTick, endTick) => {
  //     var values = [];
  //     for (var i = startTick; i <= endTick; i+=4) { values.push(i) }
  //     return values;
  // }
  //
  // const xSmallAxis = d3.axisBottom(xSmallScale)
  //     .tickPadding(30)
  //     .tickValues(getTickValues(+data[0].Start, +data[0].End))
  //     .tickFormat(d3.format("Y"))
  //     // .tickSize(-innerSmallHeight);
  // const ySmallAxis = d3.axisLeft(ySmallScale)
  //     .tickSize(-innerSmallWidth);
  //
  //  // add title: athlete name and country
  //  smallsvg.append("text")
  //      .attr("x", smallWidth / 2 )
  //      .attr("y", smallHeight - innerSmallHeight - smallMargin["top"])
  //      .style("text-anchor", "middle")
  //      .text(data[0].Name + "  (" + data[0].NOC + ")");
  //
  //   // add axis groups to smallsvg
  //   const xSmallAxisGroup = smallsvg.append("g")
  //      .attr("class", "axis x")
  //      .attr("transform", "translate(0," + innerSmallHeight + ")")
  //      .call(xSmallAxis);
  //   const ySmallAxisGroup = smallsvg.append("g")
  //      .attr("class", "axis y")
  //      .attr("transform", "translate(" + smallMargin["left"] + ",0  )")
  //      .call(ySmallAxis);
  //
  //   var x1  = d3.scaleBand();
  //   var medalTypes = groupData[0].values.map(function(d) { return d.grpName; });
  //   x1.domain(medalTypes).rangeRound([0, 30]);//x.bandwidth()]) ;
  //
  //   var slice = smallsvg.selectAll(".slice")
  //      .data(groupData)
  //      .enter().append("g")
  //      .attr("class", "g")
  //      .attr("transform",function(d) { return "translate(" + xSmallScale(d.key) + ",0)"; });
  //
  //  var color = d3.scaleOrdinal()
  //      .range(["#CD7F32","#C0C0C0","#D4AF37"]);
  //
  //  slice.selectAll("rect")
  //      .data(function(d) { return d.values; })
  //      .enter().append("rect")
  //      .attr("width", x1.bandwidth())
  //      .style("fill", function(d) { return color(d.grpName) })
  //      .attr("x", function(d) { return x1(d.grpName); })
  //      .attr("y", function(d) { return ySmallScale(d.grpValue) })
  //      .attr("height", function(d) {return innerSmallHeight - ySmallScale(d.grpValue); });
  //
  //   // now add titles to the axes
  //   smallsvg.append("text")
  //       .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
  //       .attr("transform", "translate("+ (smallMargin["left"]/2) +","+(smallHeight/2)+")rotate(-90)")  // text is drawn off the screen top left, move down and out and rotate
  //       .text("Number of Medals Won");
  //
  //   smallsvg.append("text")
  //       .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
  //       .attr("transform", "translate("+ (smallWidth/2) +","+(smallHeight-(smallMargin["bottom"]/3))+")")  // centre below axis
  //       .text("Year Competed");
  //
  //  data.forEach(function(d) {
  //      d.year = d.Year;
  //      d.medal = d.Medal;
  //      console.log(d.Name + " -- " + d.year + ", " + d.medal);
  //  });
}

// initialize the timeslider
function initializeTimeSlider() {
  var mySlider = timeslider(1896, 2016);
  // Initial start and end years
  updateTimeSlider([1896, 2016]);
  // when the input range changes, update the start and end years
  d3.select('#eventHandler').on('change', function() {
    //console.log("changed");
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

  console.log(entriesByName);
  console.log(entriesByStartThenName);
  console.log(entriesByNOC);

  // Bin: For now, setupMedalFiltering has to be called before setupNOCFiltering
  // due to dependencies.
  // TODO: Bin fix this
  //setupMedalFiltering(data);

  setupNOCFiltering(data);
}

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
// MAIN
//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////


d3.csv(csvFile).then(function(data) {
  // create the nested data structures
  initializeDataStructures(data);
  // initialize x axis domain based on data
  //xScale.domain(data.map(xValue));
  // initialize timeSlider
  initializeTimeSlider();
  // initialize medalSlider
  initializeMedalSlider();
  // initialize/create all the dropdowns/filters that will be shown in the view
  initializeOptions(data);
  autocomplete(document.getElementById("searchbar"));

});
