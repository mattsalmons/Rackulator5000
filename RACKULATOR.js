var weights = [100, 55, 45, 35, 25, 15, 10, 5, 2.5, 1.25];
var metricWeights = [25, 20, 15, 10, 5, 2.5, 2, 1.5, 1];

var defaultZero = [100, 55, 1.25];
var metricDefaultZero = [20];

// returns array of weights
function howToRack(weight, barWeight, weights) {
    var toRack = [];
    var left = weight - barWeight;
    var time = 0;
    var localWeights = new Map(weights)
    while (left > 0) {
        // find largest possible weight to add
        var found = false;
        for (let [weight, numPlates] of localWeights) {
            var amt = weight * 2;
            if (numPlates > 0 && amt <= left) {
                left -= amt;
                localWeights.set(weight, numPlates - 2);
                toRack[time] = weight;
                time++;
                found = true;
                break;
            }
        }
        if (!found) {
            toRack = []
            break;
        }
    }
    return toRack.reverse();
}

// returns sorted array of weights
function howToRackBFS(weight, barWeight, weights) {
    var best = [];
    var bestLength = -1;

    function barSum(toRack) {
        return barWeight + (2 * toRack.reduce((a, b) => { return Number(a) + Number(b); }, 0));
    }

    function passEnoughWeightSanityCheck() {
        var sum = 0;
        for (let [plateWeight, numPlates] of weights) {
            sum += plateWeight * numPlates;
        }
        return sum > weight;
    }

    function passDivisibilitySanity() {
        for (let [plateWeight, numPlates] of weights) {
            if (numPlates > 0 && plateWeight == 1.25 && weight.toString().endsWith(".5")) {
                return false;
            }
        }
        return true;
    }

    function sortResult(a, b) {
        var nA = Number(a);
        var nB = Number(b);
        if (nA < nB) {
            return -1;
        }
        else if (nA === nB) {
            return 0;
        }
        else {
            return 1;
        }
    }

    function BFS(toRack, weightsLeft) {
        const currWeight = barSum(toRack);
        if (currWeight == weight) {
            // SUCCESS
            return toRack.length;
        }
        else if (currWeight > weight) {
            // FAILURE
            return -1;
        }
        else {
            // go for breadth
            for (let [plateWeight, numPlates] of weightsLeft) {
                if (numPlates > 0) {
                    var newState = toRack.slice();
                    newState.push(plateWeight);
                    if (bestLength > 0 && newState.length > bestLength) {
                        continue;
                    }
                    var newWeightsLeft = new Map(weightsLeft);
                    newWeightsLeft.set(plateWeight, numPlates - 2);
                    /* console.log(newState);
                    console.log(newWeightsLeft); */
                    var result = BFS(newState, newWeightsLeft);
                    if (result > 0) {
                        if (bestLength === -1 || result < bestLength) {
                            // console.log("NEW BEST");
                            bestLength = result;
                            best = newState;
                        }
                    }
                }
            }
            return best;
        }
    }

    // fail fast
    if (!passEnoughWeightSanityCheck() ||
        barWeight >= weight ||
        !passDivisibilitySanity()) {
        return best;
    }

    return BFS([], weights).sort(sortResult);
}

function outputResultSVG(isMetric) {
    var form = document.forms[0];
    var weight = Number(form.weight.value);
    var barWeight = Number(form.barweight.value);
    var res = howToRack(
        weight,
        barWeight,
        getMapOfWeightsAvailable(form.weightsInc));
    // fallback to brute force if greedy fails
    if (res.length === 0) {
        if (typeof gtag === "function") {
            gtag('event', 'barbell_bfs');
        }
        res = howToRackBFS(
            weight,
            barWeight,
            getMapOfWeightsAvailable(form.weightsInc));
    }

    var justBar = false;

    if (Number(form.weight.value) === Number(form.barweight.value)) {
        justBar = true;
    }

    d3.select("#svgresult")
        .remove();

    var svg = d3.select("#result")
        .append("svg")
        .attr("id", "svgresult")
        .attr("width", 200)
        .attr("height", 550);

    if (!justBar && res.length === 0) {
        /* Not Rackable */
        svg.append("text")
            .attr("x", 10)
            .attr("y", 200)
            .text("Not Rackable!");

    } else {
        console.log(res);
        var plateSum = 2 * res.reduce((a, b) => { return Number(a) + Number(b); }, 0)
        console.log(plateSum + barWeight);
        if (plateSum + barWeight !== weight) {
            alert("Bad calculation, do not trust the result");
        }


        var barTop = 0;
        var barBottom = 400;
        var barWidth = 10;
        var barHorizCenter = 100 + barWidth / 2;

        svg.append("rect")
            .attr("id", "thebar")
            .attr("width", barWidth)
            .attr("height", barBottom - barTop)
            .attr("x", barHorizCenter - barWidth / 2)
            .attr("y", barTop);

        var scaleWidth = d3.scaleLinear().domain([1.25, 100]).range([50, 300]);
        var plateHeight = 20;

        function weightColorClass(weight, isMetric) {
            return (isMetric ? "kgs_" : "lbs_") + weight.toString().replace(".", "_");
        };

        function labelColor(weight, isMetric) {
            var weightColor = weightColorClass(weight, isMetric);
            var selection = document.querySelector("." + weightColor);
            var style = getComputedStyle(selection);
            var color = d3.color(style.fill);
            var lab = d3.lab(color);
            return lab.l > 90 ? "black" : "white";
        }

        function drawPlate(svg, y, weight, isMetric) {
            var plateWidth = scaleWidth(weight);
            svg.append("rect")
                .attr("class", weightColorClass(weight, isMetric) + " plate")
                .attr("width", plateWidth)
                .attr("height", plateHeight)
                .attr("x", barHorizCenter - (plateWidth / 2))
                .attr("y", y);
        }

        function drawPlateLabel(svg, x, y, label, isMetric) {
            svg.append("text")
                .attr("class", "plateLabel")
                .attr("fill", labelColor(weight, isMetric))
                .attr("x", x)
                .attr("y", y)
                .text(label);
        }

        var numPlates = res.length;
        for (var plate = 0; plate < numPlates; plate++) {
            var weight = res[plate];
            drawPlate(svg, 5 + barTop + plate * 25, weight, isMetric);
            drawPlateLabel(svg, barHorizCenter, 5 + barTop + plate * 25 + plateHeight - 2, weight, isMetric);

            drawPlate(svg, barBottom - (1 + plate) * 25, weight, isMetric);
            drawPlateLabel(svg, barHorizCenter, barBottom - (1 + plate) * 25 + plateHeight - 2, weight, isMetric);

        }
    }
}


function repeat(str, num) {
    var out = '';
    for (var i = 0; i < num; i++) {
        out += str;
    }
    return out;
}

function txtWeight(weight) {
    var size = Math.min(weight / 3, 50 / 3) - (String(weight).length + 1 / 2);
    var out = '';
    for (var c = 0; c < size; c++) {
        out += ' ';
    }
    return '[' + out + weight + out + ']';
}

function getMapOfWeightsAvailable(weightAmountsInputs) {
    var weightMap = new Map();
    for (i = 0; i < weightAmountsInputs.length; i++) {
        var weightInput = weightAmountsInputs[i];
        var weightAmount = weightInput.value;
        var weight = weightInput.attributes.getNamedItem("data-plate-weight").value;
        if (weightAmount) {
            weightMap.set(weight, Number(weightAmount));
        }
    }
    return weightMap;
}

function matchValue(matchMe, textElem) {
    document.getElementById(textElem).value = matchMe.value;
}

function loadValues(weights, defaultZeroWeights, defaultBarWeight, defaultWeight) {
    var checksDiv = document.getElementById('weightChecks');
    var checkTemplate = '<div class="cell small-2"><label name="weightsInc">{0}</label></div><div class="cell small-4"><input type="number" name="weightsInc" value="{1}" min="0" max="12" step="2" data-plate-weight="{0}"></div>';
    var outStr = '<div class="grid-x grid-margin-x">';

    for (i = 0; i < weights.length; i++) {

        var localNumPlates = window.localStorage.getItem('num_' + weights[i])
        var numPlates = 6; // Default number of plates
        if (!isNaN(parseFloat(localNumPlates)) && isFinite(localNumPlates)) { // https://stackoverflow.com/a/52986361/43851 I hate you Javascript!
            numPlates = parseInt(localNumPlates)
        }
        else {
            for (j = 0; j < defaultZeroWeights.length; j++) {
                if (weights[i] == defaultZeroWeights[j]) {
                    numPlates = 0;
                }
            }
        }

        outStr += checkTemplate.replace(/\{0\}/g, weights[i]).replace(/\{1\}/g, numPlates);
    }
    outStr += '</div>';
    checksDiv.innerHTML = outStr;

    // load saved weight values
    var form = document.forms[0];
    var barWeight = Number(window.localStorage.getItem('barWeight'));
    form.barweight.value = barWeight === 0 ? defaultBarWeight : barWeight;
    var weight = Number(window.localStorage.getItem('weight'));
    form.weight.value = weight === 0 ? defaultWeight : weight;
}

function saveValues() {
    var form = document.forms[0]
    var numPlates = form.weightsInc;
    for (i = 0; i < numPlates.length; i++) {
        var whichPlate = numPlates[i].attributes.getNamedItem("data-plate-weight").value;
        window.localStorage.setItem('num_' + whichPlate, numPlates[i].value);
    }

    window.localStorage.setItem('barWeight', form.barweight.value);
    window.localStorage.setItem('weight', form.weight.value);
}

window.onload = function () {
    if (document.URL.endsWith("metric.html")) {
        loadValues(metricWeights, metricDefaultZero, 20, 60);
    }
    else {
        loadValues(weights, defaultZero, 45, 135);
    }
};
