angular.module('common')
    .directive('dirRangeFilter', ['FilterPanelService','AttrInfoService', 'SelectorService', 'BROADCAST_MESSAGES',
        function(FilterPanelService, AttrInfoService, SelectorService, BROADCAST_MESSAGES) {
            'use strict';

            /*************************************
    ******** Directive description *******
    **************************************/
            var dirDefn = {
                restrict: 'AE',
                require: '?^dirAttrRenderer',
                templateUrl: '#{server_prefix}#{view_path}/components/project/distributions/filters/rangeFilter.html',
                scope: {},
                link: postLinkFn
            };

            /*************************************
    ************ Local Data **************
    **************************************/
            var logPrefix = '[dirRangeFilter: ] ';


            /*************************************
    ******** Controller Function *********
    **************************************/


            /*************************************
    ******** Post Link Function *********
    **************************************/
            function postLinkFn(scope, element, attrs, renderCtrl) {
                var
                    attrId       = renderCtrl.getAttrId(),
                    filterConfig = FilterPanelService.getFilterForId(attrId),
                    attrInfo     = AttrInfoService.getNodeAttrInfoForRG().getForId(attrId),
                    binCount     = renderCtrl.getBinCount();

                console.assert(attrInfo.isNumeric || attrInfo.isYear, logPrefix + 'attribute should be isNumeric/isYear');

                setRange();

                scope.bounds = {
                    min : 0,
                    max : binCount,
                    step: 1
                };
                scope.sliderObj ={
                    range: true,
                    start: function(ev, ui) {
                        console.log(logPrefix + 'Slider start - event & ui ', ev, ui);
                    },
                    stop: function(ev, ui) {
                        console.log(logPrefix + 'Slider stop - event & ui ', ev, ui);
                        var valueRange = getValueRangeFilterRange(scope.filterRange[0], scope.filterRange[1]);
                        renderCtrl.hoverNodesByAttribRange(attrInfo.attr.id, valueRange.min, valueRange.max, window.event);
                        applyFilters(scope.bounds, scope.filterRange);
                    }
                };

                scope.$on(BROADCAST_MESSAGES.fp.initialSelection.changed, function() {
                    attrId       = renderCtrl.getAttrId();
                    filterConfig = FilterPanelService.getFilterForId(attrId);
                    attrInfo     = AttrInfoService.getNodeAttrInfoForRG().getForId(attrId);

                    // Reset filter values selection on selection reset
                    init(scope.bounds);
                    // console.log(logPrefix + 'dirRangeFilter filter obj: ', filterConfig);
                });

                scope.$on(BROADCAST_MESSAGES.fp.currentSelection.changed, function() {
                    filterConfig = FilterPanelService.getFilterForId(attrId);
                    // Reset filter values selection on selection reset
                    setRange();
                    // console.log(logPrefix + 'dirRangeFilter filter obj: ', filterConfig);
                });

                scope.$on(BROADCAST_MESSAGES.fp.filter.reset, function() {
                    scope.filterRange = [0, binCount];
                });

                function init () {
                    binCount = renderCtrl.getBinCount();
                    scope.filterRange = [0, binCount];
                    scope.bounds.max = binCount;
                }

                function setRange() {
                    scope.filterRange = filterConfig.state.filterRange
                        ? _.clone(filterConfig.state.filterRange)
                        :  [0, binCount];
                }

                function applyFilters(bounds, filterRange) {
                    console.assert(filterRange[0] < filterRange[1]);
                    console.assert(bounds.min <= filterRange[0]);
                    console.assert(bounds.max >= filterRange[1]);

                    var disableFilter = filterRange[0] == bounds.min && filterRange[1] == bounds.max;

                    filterConfig.isEnabled = !disableFilter;
                    filterConfig.state.filterRange = _.clone(filterRange);
                    filterConfig.selector = filterConfig.isEnabled ? genSelector(filterRange[0], filterRange[1]) : null;
                }

                function genSelector (min, max) {
                    console.log('attrInfo: ', attrInfo);
                    var attrMax = attrInfo.stats.max, attrMin = attrInfo.stats.min;
                    var step = (attrMax - attrMin) / binCount;

                    var
                        valMin = attrMin + (min === 0 ? 0 : min * step),
                        valMax = max === binCount ? attrMax : attrMin + max * step;

                    var selector = SelectorService.newSelector();
                    selector.ofAttrRange(attrId, valMin, valMax);
                    return selector;
                }

                function getValueRangeFilterRange(min, max) {
                    var attrMax = attrInfo.stats.max, attrMin = attrInfo.stats.min;
                    var step = (attrMax - attrMin) / binCount;

                    var
                        valMin = attrMin + (min === 0 ? 0 : min * step),
                        valMax = max === binCount ? attrMax : attrMin + max * step;

                    return {
                        min: valMin,
                        max: valMax
                    };
                }
            }



            /*************************************
    ************ Local Functions *********
    **************************************/



            return dirDefn;
        }]);