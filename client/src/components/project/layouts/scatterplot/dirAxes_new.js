angular.module('common')
.directive('drawaxis', ['$compile', '$timeout', 'renderGraphfactory', 'layoutService','leafletData','dataGraph', 'AttrInfoService', 'BROADCAST_MESSAGES',
function ($compile, $timeout, renderGraphfactory, layoutService, leafletData, dataGraph, AttrInfoService, BROADCAST_MESSAGES) {
    'use strict';

    /*************************************
    ******** Directive description *******
    **************************************/
    var dirDefn = {
        template:
        //
        // WARN: there is a hardcode of 50 offset for both top and left in the drawMarker to counter CSS margins.
        //
        '<div id="axes" class="axis-container">'+
            '<div class="graph-type">'+
                '<div ng-click="zoomInfo.zoomExtents()" class="circle" tooltip="Reset Graph" tooltip-placement="right">'+
                    '<i class="fa fa-circle-o fa-2x"/>'+
                '</div>'+
                //'<i class="icon-{{player.activeSnap.layout.plotType}}"/>'+
            '</div>'+
            '<div ng-show="yshow" class="yaxis-tit"><div><h4 class="truncate no-text-transform" uib-tooltip="{{mapprSettings.yAxTooltip}}" tooltip-placement="right"><span>{{mapprSettings.yAxLabel || yAxisTitle}}</span></h4></div></div>'+
            '<div ng-show="yshow" class="yaxis-bkgrnd"></div>'+
            '<div ng-show="yshow && mapprSettings.yAxTickShow" class="yaxis"></div>'+
            '<div ng-show="xshow" class="xaxis-tit"><div><h4 class="truncate no-text-transform" uib-tooltip="{{mapprSettings.xAxTooltip}}" tooltip-placement="top"><span>{{mapprSettings.xAxLabel || xAxisTitle}}</span></h4></div></div>'+
            '<div ng-show="xshow" class="xaxis-bkgrnd"></div>'+
            '<div ng-show="xshow" class="xaxis-container">'+
            '<div ng-show="xshow && mapprSettings.xAxTickShow" class="xaxis"></div>'+
            '</div>'+
            '<div ng-show="xshow && yshow" class="axes-square"></div>'+
        '</div>',
        restrict: 'EA',
        scope: true,
        link: postLinkFn
    };

    /*************************************
    ************ Local Data **************
    **************************************/
    // timestamp formats. if max element changing is
    // var timestampFormats = {
    //     "ms": "ss:SS",
    //     "seconds": "mm:ss",
    //     "minutes": "HH:mm:ss",
    //     "hours": "ddd HH:mm:ss",
    //     "days": "MMM DD, HH:mm",
    //     "months": "MMM DD YY, HH:mm",
    //     "years": "MMM DD YYYY",
    //     "default" : window.moment.defaultFormat
    // };

    // var formatAxis = {
    //     x : timestampFormats["default"],
    //     y : timestampFormats["default"]
    // };


    /*************************************
    ******** Controller Function *********
    **************************************/



    /*************************************
    ******** Post Link Function *********
    **************************************/
    function postLinkFn(scope, element) {
        console.log('Axis directive started');
        var $xaxis = $('.xaxis', element),
            $yaxis = $('.yaxis', element),
            axisIds = ['x','y']; // helpful iterator :)
        // only show axis in scatterplot
        scope.xshow = false; // Show the x axis (ticks are controlled by diff setting)
        scope.yshow = false;
        scope.xAxisTitle = '';
        scope.yAxisTitle = '';

        scope.$on(BROADCAST_MESSAGES.sigma.rendered, processAxis);

        function processAxis() {
            if(scope.layout.plotType == 'scatterplot') {
                _.each(axisIds, function(axis) {
                    if(scope.layout.setting(axis + 'AxShow')) {
                        scope[axis + 'show'] = true;
                        clearAxis(axis);
                        buildAxis(axis);
                    } else {
                        if(scope[axis + 'show']) clearAxis(axis);
                        scope[axis + 'show'] = false;
                    }
                });
            }
            else {
                $xaxis.empty();
                $yaxis.empty();
            }
        }
        // bindings for pan
        renderGraphfactory.getSig().then(function(sig) {
            sig.cameras.cam1.bind('coordinatesUpdated',function() {
                repositionMarkers();
            });
        });

        // tween on zooms
        scope.$on(BROADCAST_MESSAGES.zoom.end, rebuildAndRepositionMarkers);
        // scope.$on(BROADCAST_MESSAGES.zoom.start, function() {});
        //scope.$on(BROADCAST_MESSAGES.zoom.out, rebuildAndRepositionMarkers);
        //scope.$on(BROADCAST_MESSAGES.zoom.reset, rebuildAndRepositionMarkers);

        //each zoom end - the camera center is recorded so that camera pan can find offsets
        var currZoomLvlCam = {x:0, y:0};

        //processAxis();

        function repositionMarkers () {
            _.each(axisIds, function(axis) {
                if(scope[axis + 'show']) {
                    var
                        sig         = renderGraphfactory.sig(),
                        sigCamAxis  = sig.cameras.cam1[axis],
                        sigCamRatio  = sig.cameras.cam1.ratio,
                        $axis       = axis === 'x' ? $xaxis : $yaxis,
                        deviation = sigCamAxis / sigCamRatio;

                    //calculate offset from the camera center (at zoom end)
                    (axis === 'x') ? $axis.css({left: currZoomLvlCam[axis] - deviation}) : $axis.css({top: currZoomLvlCam[axis] - deviation});

                } else {
                    clearAxis(axis);
                }
            });
        }

        function rebuildAndRepositionMarkers () {
            _.each(axisIds, function(axis) {
                if(scope[axis + 'show']) {
                    console.log('rebuildAndRepositionMarkers ', axis);
                    clearAxis(axis);
                    buildAxis(axis);
                } else {
                    clearAxis(axis);
                }
            });
        }
        // Hides all markers on the given axis
        // function hideAxisMarkers (axis) {
        //     (axis === 'x') ? $xaxis.hide() : $yaxis.hide();
        // }

        function showAxisMarkers (axis) {
            (axis === 'x') ? $xaxis.show() : $yaxis.show();
        }


        function clearAxis (axis) {
            if(!scope[axis + 'show']) return;

            console.log('clear axis-', axis,' contents');
            if(axis === 'x'){
                $xaxis.css({left: 0});
                $xaxis.empty();
            } else {
                $yaxis.css({top:  0});
                $yaxis.empty();
            }
            //record cam center
            currZoomLvlCam[axis] = renderGraphfactory.sig().cameras.cam1[axis] / renderGraphfactory.sig().cameras.cam1.ratio;
        }

        // Build an axis
        function buildAxis (axis) {
            // scatterplot always builds

            var
                layout       = scope.layout,
                scaler       = layout.scalers[axis],
                sig          = renderGraphfactory.sig(),
                sigCamAxis   = sig.cameras.cam1[axis],
                sigCamRatio  = sig.cameras.cam1.ratio,
                zoomLevel    = dataGraph.getRenderableGraph().zoomLevel,
                renderGraph  = dataGraph.getRenderableGraph(),
                axisLabel    = layout.attr[axis],
                attrInfo     = AttrInfoService.getNodeAttrInfoForRG().getForId(axisLabel),
                displaySize = axis === 'x' ? $('#sig-holder').width(): $('#sig-holder').height();

            var graphCenter, displayBoundsMin, displayBoundsMax, extensions,
                ticks, numTicks = 10, displayPos;

            // only build if layout wants to show the axis and the ticks
            if(!(layout.setting(axis + 'AxShow') && layout.setting(axis + 'AxTickShow'))) {
                return;
            }

            if(!attrInfo) {
                return console.warn('Can\'t build axis for attributes which do not exist');
            }
            scope[axis + 'AxisTitle'] = attrInfo.attr.title;

            var scalerInfo = layout.scalers[axis + '_scaler_info'];
            var shiftInputValBy = scalerInfo.shiftInputValBy || 0;

            if(attrInfo.isNumeric && attrInfo.attr.attrType !== 'timestamp') {
                graphCenter = (scaler(attrInfo.bounds.min) + scaler(attrInfo.bounds.max)) / 2;
                extensions = scalerInfo.scalerType != 'linear' ? 0 : 2;

                // we use a scaler to generate the ticks on the graph
                var scale = d3.scale.linear();
                if(scalerInfo.scalerType === 'log') {
                    scale = d3.scale.log().base(+scalerInfo.base);
                } else if(scalerInfo.scalerType === "exponential") {
                    scale = d3.scale.pow();
                }

                scale.domain([attrInfo.bounds.min + shiftInputValBy, attrInfo.bounds.max + shiftInputValBy]);

                scale.nice(numTicks + extensions);

                ticks = scale.ticks(numTicks + extensions);

                _.each(ticks, function(tickPos) {
                    // Calculate the position at which the tick needs to be rendered.
                    var valForTick = tickPos - shiftInputValBy,
                        screenPos = scaler(valForTick),
                        labelGenerator = _.get(attrInfo, 'attr.attrType') !== 'year' ? genLabelForIntegral : _.identity;
                    var dataGraphPos = (screenPos - graphCenter) / renderGraph.baseRatio;
                    if(!isFinite(dataGraphPos)) { return; }
                    displayPos = (dataGraphPos - sigCamAxis) / sigCamRatio  + displaySize/2;
                    drawMarker(axis, zoomLevel, valForTick, displayPos, labelGenerator(valForTick));
                });

            } else if(attrInfo.attr.attrType === 'timestamp') {
                graphCenter = (scaler(attrInfo.bounds.min) + scaler(attrInfo.bounds.max + shiftInputValBy)) / 2;
                displayBoundsMin = window.moment.unix(attrInfo.bounds.min);
                displayBoundsMax = window.moment.unix(attrInfo.bounds.max);

                var timeScale = d3.time.scale.utc();

                ticks = timeScale.domain([displayBoundsMin.toDate(), displayBoundsMax.toDate()])
                    .range(timeScale.domain())
                    .nice(numTicks).ticks(numTicks);
                var tickFormatter = timeScale.tickFormat();

                // ticks =  genTicks(axis, displayBoundsMin, displayBoundsMax, numTicks);
                // display each tick.
                _.each(ticks, function(tickDate) {
                    // Calculate the position at which the tick needs to be rendered.
                    var dataGraphPos = (scaler(window.moment(tickDate).unix()) - graphCenter) / renderGraph.baseRatio;
                    displayPos = (dataGraphPos - sigCamAxis) / sigCamRatio  + displaySize/2;
                    drawMarker(axis, zoomLevel, tickFormatter(tickDate), displayPos, tickFormatter(tickDate));
                    // drawMarker(axis, zoomLevel, genLabelForTimestamp(axis, tickPos), displayPos, genLabelForTimestamp(axis, tickPos));
                });
            } else {
                // For ordinal scales, the range is stored in the scale itself.
                displayBoundsMin = scaler.rangeExtent()[0];
                displayBoundsMax = scaler.rangeExtent()[1];
                graphCenter = (displayBoundsMin + displayBoundsMax) / 2;


                //for ordinal scales we want to display only
                //a constant number of nearly equally spaced labels.
                //  |       |       |       |       |       |       |       |       |       |
                //  0       1       2       3       4       5       6       7       8       9
                //  x               x                       x               x               x
                //

                var first = attrInfo.values[0];
                var last = attrInfo.values[attrInfo.values.length-1];
                var availableWidth = Math.abs((scaler(last)-scaler(first)) / sigCamRatio);

                //find number of optimum labels to display
                var numberOfLabelsToDisplay = Math.floor(availableWidth/120);

                var widthOfInterval = attrInfo.values.length/numberOfLabelsToDisplay; //9/5 = 1.8

                //leave last - will add separately
                var filtered = [];
                for (var i = 0, l = attrInfo.values.length-1; i < l; i+=widthOfInterval) {
                    filtered.push(attrInfo.values[Math.round(i)]);
                }
                //force the last for a nice boundary
                filtered.push(last);


                _.each(filtered, function(label) {
                    var dataGraphPos = (scaler(label) - graphCenter) / renderGraph.baseRatio;
                    // displayPos = ((scaler(label) - graphCenter) / ratio ) - sigCamAxis + displaySize/2;
                    displayPos = (dataGraphPos - sigCamAxis) / sigCamRatio  + displaySize/2;
                    drawMarker(axis, zoomLevel, label, displayPos, label);
                });
            }

            showAxisMarkers(axis);
        }

        /**
         * Draws marks on the axis
         * @param  {string} axis       axis to draw (x or y)
         * @param  {int} zoomLevel     The current zoom level
         * @param  {string} scalePosId the id of the tick
         * @param  {float} coords      the absolute position on the axis
         * @param  {string} label      The tick label
         * @return {undefined}
         * TODO: use data attrib for id purposes.
         */
        function drawMarker (axis, zoomLevel, scalePosId, coords, label) {
            var
                $axis  = axis === 'x' ? $xaxis : $yaxis,
                id     = 'marker-'+axis+'-'+Math.floor(zoomLevel/4)+'-'+ makeSafeForId(scalePosId),
                $marker = $('#' + id);

            //possible optimization - build marker only if within screen.bounds..

            if($marker.length === 0) {
                var ttPlace = (axis == 'x') ? 'top' : 'right';
                var template = '<div class="marker marker-0" id="' + id + '"><div><div tooltip-append-to-body="true" tooltip-placement="'+ttPlace+'" tooltip="'+label+'"><h7>'+label+'</h7></div></div>';

                var content = $compile(template)(scope);
                $marker = $(content);
                $axis.append($marker);
            } else {
                $marker.show();
            }

            if(axis == 'x') {
                $marker.css({
                    left:  coords
                });
            } else {
                $marker.css({
                    top: coords
                });
            }

            // $marker.find('h7').parent().tooltip();

            $marker.find('h7').parent().succinct({
                size: 50
            });


        }

        // Number formatting
        var SIFormatter = d3.format("s");
        var floatFormatter = d3.format(",.2f");

        function formatNumber(val) {
            //@bimal check and resolve - if(Math.abs(val) < 1 && (val % 1 !== 0)) {
            if((val % 1 !== 0)) {
                return floatFormatter(val);
            }
            else {
                return SIFormatter(val);
            }
        }

        function genLabelForIntegral (val) {

            return formatNumber(val);
            // return Math.round(val*100)/100;
        }

        // function genLabelForTimestamp (axis, momentVal) {
        //     return momentVal.utc().format(formatAxis[axis]);
        // }

        // function genTicks (axis, begin, end, numTicks) {
        //     var range = window.moment.twix(begin, end);
        //     var prefixes = ["seconds","minutes","hours","days","months","years"];
        //     var ranges = [range.count("ms")]; // atleast have milliseconds
        //     _.each(prefixes, function(pfx) {
        //         var count = range.count(pfx);
        //         if(count >= numTicks) {
        //             ranges.push(count);
        //         } else return false; // exit loop if interval can't be subdivided
        //     });
        //     var ticks = [begin];
        //     var prefix = ranges.length < 2 ? "ms" : prefixes[ranges.length - 2]; // the max prefix which can be subdivided
        //     var interval = Math.round(_.last(ranges) / (numTicks - 2));
        //     var iter = range.iterate(interval, prefix);
        //     while(iter.hasNext()) {
        //         ticks.push(iter.next());
        //     }
        //     ticks.push(end);
        //     formatAxis[axis] = timestampFormats[prefix];
        //     return ticks;
        // }


        // Builds a id safe string
        function makeSafeForId(name) {
            if(isFinite(name)) return name;
            else {
                return name.replace(/[^a-z0-9]/g, function(s) {
                    var c = s.charCodeAt(0);
                    if (c == 32) return '-';
                    if (c >= 65 && c <= 90) return s.toLowerCase();
                    return '__' + ('000' + c.toString(16)).slice(-4);
                });
            }
        }
    }



    /*************************************
    ************ Local Functions *********
    **************************************/



    return dirDefn;
}
]);
