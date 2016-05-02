
// dwFilter
(function( $ ){
  "use strict"

  var scripts = document.getElementsByTagName("script");
  var urlBase = scripts[scripts.length-1].src;
  urlBase = urlBase.replace('dw-typeahead.js', '');

  let shadowDown;

  let selectedIds = [];
  let groups = [];

  // Public methods
  let api = {
    init : function(options) {
      const $el = $(this);
      if(!options.delete){
        // deploy component structure
        let deployment = new Promise(function(resolve, reject){
          methods.deployComponent($el, options);
          resolve()
        })
        deployment.then(function(){
          methods.getTemplate($el, options);
        })
      }else{
        methods.delete($el, options);
      }
    },
    destroy: function(){
      selectedIds = [];

      const $el = $(this);
      $el.empty();
      $el.removeClass('dw-typeahead');
    },
    val: function($el){
      (typeof $el === 'undefined' || $el === null ) ? $el = $(this) : null;
      methods.getVal($el);
    },
    restart: function($el, hard){
      (typeof $el === 'undefined' || $el === null ) ? $el = $(this) : null;
      // previene cuando no hay input
      let $groups = $el.find('.options .group');
      let $groupsContent = $el.find('.options .group-content');
      $groups.show();
      $groupsContent.show();

      // previene cuando no hay input
      let $options = $el.find('.options .option');
      $options.show();

      // deselect
      $options.removeClass('selected')
      if(hard){
        $el.data('result','')
      }else{
      }

    },
    empty: function($el){
      (typeof $el === 'undefined' || $el === null ) ? $el = $(this) : null;
      let $options = $el.find('content > .options');
      let $clear = $el.find('.clear');
      let $search = $el.find('#search');
      $options.addClass('hide');
      $clear.addClass('hide');
      $search.val('');  // clean text search
      // Clear result data
      $el.data('result', null);
    }
  }

  // Private methods
  let methods = {

    deployComponent: function($el, options){
      // convert the div into a dw-filter component
      $el.addClass('dw-typeahead');
    },

    getTemplate: function($el, options){

      $.get(urlBase + "templates/dw-typeahead.html", function( result ) {
        let templateContent = result;
        methods.setTemplate($el, templateContent, options)
      });

    },

    setTemplate : function($el, templateContent, options){

      let template = _.template(templateContent);
      // paint component structure if is not an add
      if(!options.add){
        $el.html( template({
          'placeholder': options.placeholder
        }) );
      }

      if (typeof options !== 'undefined') {
        methods.optionTemplate($el, options)
      } // Todo: falta cuando no trae contenido - $('#sample1').dwSelect()

    },
    optionTemplate: function($el, options){
      let optionsData = (options.add) ? options['add'] : options.data;
      if(optionsData.length > 0){

        let contains = _.contains(selectedIds, optionsData[0]['id'])
        let head = optionsData[0];

        // If has groups, paint groups containers
        if ( head.hasOwnProperty('group') ) {
          // define groups
          let tempGroups =  _.chain(optionsData).flatten().pluck('group').flatten().unique().value().sort();
          groups = _.union(groups,tempGroups, optionsData[0].group[0]);
          groups = _.uniq(groups);

          // paint groups containers
          if(!options.add){
            _.each(groups, function(group){
              $el.find('content > .options').append('<div class="group" id="' + group + '"><div class="title"><span class="name">' + group + '</span><span class="open"></span></div></div><div class="group-content ' + group + '"></div>')
            })
          } else {
            if (!contains) {

              let optionsSize = $el.find('content .group-content.' + optionsData[0].group[0] + ' .option').size();
              groups.push(optionsData[0].group[0]);
              groups = _.uniq(groups);
              groups = groups.sort();
              if(optionsSize == 0){
                let groupIndex = _.sortedIndex(groups, optionsData[0].group[0]);
                let appendPoint = groups[groupIndex];

                if(groupIndex == groups.length - 1){
                  $el.find('content > .options').append('<div class="group" id="' + optionsData[0].group[0] + '"><div class="title"><span class="name">' + optionsData[0].group[0] + '</span><span class="open"></span></div></div><div class="group-content ' + optionsData[0].group[0] + '"></div>')
                }else{
                  $el.find('content > .options .group#' + groups[groupIndex+1]).before('<div class="group" id="' + optionsData[0].group[0] + '"><div class="title"><span class="name">' + optionsData[0].group[0] + '</span><span class="open"></span></div></div><div class="group-content ' + optionsData[0].group[0] + '"></div>')
                }
              }
            } else {
              console.info("ya existe id");
            }
          }

          // check if exist id
          if (!contains) {
            // put options into its group
            $.get(urlBase + "templates/options.html", function( result ) {
              let template = _.template(result);
              let sorted_options = _.sortBy(optionsData, 'primary');

              // options each
              sorted_options.forEach(option => {
                let contentHtml = template({
                  id: option['id'],
                  primary: option['primary'],
                  secundary: option['secundary'],
                  selected: option['selected']
                });
                // paint in specific group content
                let group = option['group'];
                let primary = option['primary'];

                var $selector = $el.find('.' + group + '.group-content');
                if(!options.add){
                  $selector.append(contentHtml);
                }else{
                  let position = parseInt( methods.sortInGroup($el, optionsData[0].group[0], optionsData[0].primary) );
                  let items = $el.find('.group-content.' + group + ' .primary');
                  if(items.length == 1){
                    if(position == 0){
                      $el.find('.' + group + '.group-content .option:first-child').before(contentHtml);
                    }else{
                      $selector.append(contentHtml);
                    }
                  }else{
                    if(position == 0){
                      if(items.length == 0){
                        $selector.append(contentHtml);
                      }else{
                        $el.find('.' + group + '.group-content .option:first-child').before(contentHtml);
                      }
                    }else if(position == items.length){
                      $selector.append(contentHtml);
                    }else{
                      position = position+1;
                      $el.find('.' + group + '.group-content .option:nth-child(' + position + ')').before(contentHtml);
                    }
                  }

                }
              });

              methods.setPosition($el);
              events.start($el, options);
            });
          }
        } else{

          // no groups
          // put options into its group
          $.get(urlBase + "templates/options.html", function( result ) {
            let template = _.template(result);

            let data = _.sortBy(optionsData, 'primary');

            // options each
            optionsData.forEach(data => {
              let contentHtml = template({
                id: data['id'],
                primary: data['primary'],
                secundary: data['secundary'],
                selected: data['selected']
              });
              $el.find('content > .options').append(contentHtml);
            });



            methods.setPosition($el);
            events.start($el, options);
          });
        }

      }else{
        // console.log("empty: no options");
      }
    },
    setPosition: function($el){
      let windowHeight = $(window).height();
      let scrollTop = methods.previousParentsScrollTop($el);
      let scrollLeft = methods.previousParentsScrollLeft($el);

      let contentWidth = $el.outerWidth();
      let elHeight = $el.offset().top
      let contentTop = elHeight + $el.height() - scrollTop;
      let contentLeft = $el.offset().left - scrollLeft;
      let contentHeight = $el.find('content').height();
      let headerHeight = $el.find('header').height();

      // vertical
      if(windowHeight - ( contentTop + contentHeight ) < 0 ){
        $el.find('content').css({
          top: contentTop - contentHeight + - headerHeight + 'px'
        });
        shadowDown = false;
        methods.putShadow($el);
      }else{
        $el.find('content').css({
          top: contentTop + 'px'
        });
        shadowDown = true;
        methods.putShadow($el);
      }
      // horizontal
      $el.find('content').css({
        width: contentWidth + 'px',
        left: contentLeft + 'px'

      })
      // shadow
    },
    previousParentsScrollTop: function($el){
      (function($) {
          $.fn.hasScrollBar = function() {
              return this.get(0).scrollHeight > this.height();
          }
      })(jQuery);

      let scroll;

      $el.parents().filter(function(){
        if( $(this).hasScrollBar() ){
          scroll = $(this).scrollTop();
          return
        }
      })

      return scroll;
    },
    previousParentsScrollLeft: function($el){
      (function($) {
          $.fn.hasScrollBar = function() {
              return this.get(0).scrollHeight > this.height();
          }
      })(jQuery);

      let scroll;

      $el.parents().filter(function(){
        if( $(this).hasScrollBar() ){
          scroll = $(this).scrollLeft();
          return
        }
      })

      return scroll;
    },
    getPreviousParentScroll: function($el){
      (function($) {
          $.fn.hasScrollBar = function() {
              return this.get(0).scrollHeight > this.height();
          }
      })(jQuery);

      let parentScroll;

      $el.parents().filter(function(){
        if( $(this).hasScrollBar() ){
          parentScroll = $(this);
          return
        }
      })

      return parentScroll;

    },
    hideOptions: function($el, inputData, options){

      if( options.data[0].hasOwnProperty('group') ){

        let firstLetter = inputData.charAt(0);
        (firstLetter != ':') ? methods.hideOption($el, inputData, options) : methods.hideGroups($el, inputData, options);

      }

    },
    hideOption: function($el, inputData, options){
      let $option = $el.find('.option').toArray();

      $option.forEach(opt => {

        const $opt = $(opt);
        let tempPrimary = $opt.find('.primary').text();
        let tempSecundary = $opt.find('.secundary').text();

        tempPrimary = tempPrimary.toLowerCase();
        tempSecundary = tempSecundary.toLowerCase();

        inputData = inputData.toLowerCase();

        ( tempPrimary.indexOf(inputData) != -1 || tempSecundary.indexOf(inputData) != -1 ) ? $opt.show() : $opt.hide();

      });

    },
    hideGroups: function($el, inputData, options){
      let $groups = $el.find('.options .group').toArray();

      $groups.forEach(grp => {
        const $grp = $(grp);
        let tempInput = $grp.find('.title .name').text()

        if ( inputData.indexOf(' ') != -1 ){
          let optTemp = inputData.split(' ');

          // groups
          optTemp[0] = optTemp[0].toLowerCase();
          optTemp[0] = optTemp[0].replace(':','');
          ( tempInput.indexOf(optTemp[0]) != -1 ) ? $grp.show() : $grp.hide();
          ( tempInput.indexOf(optTemp[0]) != -1 ) ? $grp.next().show() : $grp.next().hide();

          // options

          let $option = $el.find('.option').toArray();

          $option.forEach(opt => {

            const $opt = $(opt);
            let tempPrimary = $opt.find('.primary').text();
            let tempSecundary = $opt.find('.secundary').text();

            tempPrimary = tempPrimary.toLowerCase();
            tempSecundary = tempSecundary.toLowerCase();

            optTemp[1] = optTemp[1].toLowerCase();

            ( tempPrimary.indexOf(optTemp[1]) != -1 || tempSecundary.indexOf(optTemp[1]) != -1 ) ? $opt.show() : $opt.hide();
          });

        }else{
          tempInput = tempInput.toLowerCase();
          inputData = inputData.replace(':','');
          inputData = inputData.toLowerCase();
          ( tempInput.indexOf(inputData) != -1 ) ? $grp.show() : $grp.hide();
          ( tempInput.indexOf(inputData) != -1 ) ? $grp.next().show() : $grp.next().hide();
        }
      });

    },
    getVal: function($el){
      // update $el data
      let options = $el.find('.options .option.selected').toArray();
      let ids = [];
      for(let i in options){
        let $opt = $(options[i]);
        ids.push($opt.data('id'));
      }

      $el.data('result', _.uniq(ids));
      methods.passResult($el);
      return ids;
    },
    passResult: function($el){
      $el.trigger('change');
    },
    showSelected: function($el, selectedDiv, options){
      let $search = $el.find('.search input');
      let primaryContent = selectedDiv.find('.primary').text();

      $search.val(primaryContent);
      $search.focus();

    },
    putShadow: function($el){
      (shadowDown) ? $el.find('.options').addClass('shadowDown').removeClass('shadowUp') : $el.find('.options').addClass('shadowUp').removeClass('shadowDown');
    },

    delete: function($el, options){
      let optionsToDelete = options.delete;
      for(let i=0;i<optionsToDelete.length;i++){
        let itemId = options.delete[i]['id'];
        // delete items
        methods.removeItem($el, itemId);
        //update selectedItems
        let itemsId = [];
        itemsId.push(itemId);
        selectedIds = _.difference(selectedIds, itemsId)

      }
    },

    removeItem: function($el, itemId){
      let groupItem = $el.find('.option[data-id="' + itemId +  '"]').parent().attr('class').replace('group-content ','');
      $el.find('.option[data-id="' + itemId +  '"]').remove();
      let $groupItem = $('#' + groupItem);
      let groupItemLength = $groupItem.next().children().length;
      if (groupItemLength == 0) {
        // borrar titulo del grupo
        $el.find('.group#' + groupItem).remove();
        // borrar contenedor de opciones
        $el.find('.group-content.' + groupItem).remove();
        // remove from groups array
        groups = _.difference(groups, [groupItem]);
      }
    },

    sortInGroup: function($el, group, primary){
      let items = $el.find('.group-content.' + group + ' .primary');
      if(items.length == 0){
        return 0;
      }else{
        let primaries = [];
        items.each(function(i, item){
          primaries.push( $(item).text() );
        })

        primaries = _.union(primaries, [primary]);
        primaries = _.uniq(primaries);
        primaries = primaries.sort();
        return _.sortedIndex(primaries, primary);

      }

    },
    nextgroupCalc: function($el, currentGroup, totalGroups){
      for(let i=currentGroup+1;i<totalGroups;i++){
        if( !$el.find('.group-content:eq(' + i + ')').children(':visible').length == 0 ){
          return i;
        }
      }
    },
    prevgroupCalc: function($el, currentGroup, totalGroups){
      if(currentGroup == -1){
        currentGroup = totalGroups;
      }
      for(let i=currentGroup-1;i>-1;i--){
        if( !$el.find('.group-content:eq(' + i + ')').children(':visible').length == 0 ){
          return i;
        }
      }
    },
    updateScroll: function($el){
      let $selected = $el.find('.option.selected');
      if($selected != 'undefined' || $selected != null || $selected != ''){
        let $options = $el.find('.options');
        $options.stop().animate({
          scrollTop: $selected.offset().top - $selected.scrollTop() - $options.offset().top
        }, 500);
      }
    }
  }


  // Events
  var events = {

    start: function($el, options){
      let $options = $el.find('.option').toArray();
      $options.forEach(opt => {
        let $opt = $(opt);
        selectedIds.push($opt.data('id'));
        selectedIds = _.uniq(selectedIds);  // prevent duplicate ids
      })

      events.onSearch($el, options);
      events.clearSearch($el, options);
      events.clickOption($el, options);
      events.clickOut($el, options);
      events.updatePosition($el);
      api.restart($el, false);
    },
    initOptions: function($el, options){
      let $option = $el.find('content > .options > .option');
      $option.removeClass('hide');
      $option.css({
        'display': 'block'
      })
    },
    toggleGroup: function($el, options){
    },
    onSearch: function($el, options){
      let $search = $el.find('.search input');
      let $options = $el.find('content > .options');
      let $clear = $el.find('.clear');

      $search.on({
        keyup: function(event){
          var inputData = $search.val();
          methods.hideOptions($el, inputData, options);

          // show/hide clear icon
          ($search.val().length > 0) ? $clear.removeClass('hide') : $clear.addClass('hide');
          $el.find('.options').removeClass('hide');
          methods.setPosition($el);
        },
        focus: function(event){
          // $search.removeClass('glass');

          $options.removeClass('hide');
          methods.setPosition($el);
          events.initOptions($el, options);

          // show/hide clear icon
          ($search.val().length > 0) ? $clear.removeClass('hide') : $clear.addClass('hide');

          // active shortcuts
          events.initShortcuts($el, options);
        },
        focusout: function(event){
          api.restart($el, false);
          events.destroyShortcuts($el);
        }
      });
    },
    initShortcuts: function($el, options){
      $el.keydown(function(event){
        let code = (event.keyCode ? event.keyCode : event.which);                                   // get press key code
        let currentSelectedItem = $el.find('.options .selected').index();                           // get index of current selected item
        let currentGroupClass = $el.find('.options .selected').parent().attr('class');              // get group class
        let allgroups = $el.find('.group-content');                                                 // an array of groups classes
        let currentGroup = _.sortedIndex(allgroups, {className: currentGroupClass}, 'className');   // get id of current class
        let nextgroup;
        let prevgroup;
        let $item;
        let $next;
        let $prev;

        // Acciones segun tecla presionada
        switch (code) {
            case 40:
                // down
                // Primero reconoce si parte desde cero
                // o si ya existe un item seleccionado
                if(currentSelectedItem != -1){
                  $item = $el.find('.group-content:eq(' + currentGroup + ')').find('.option:eq(' + currentSelectedItem + ')');
                  $next = $item.nextAll('.option:visible:first');

                  $el.find('.options .option').removeClass('selected');
                  $next.addClass('selected');

                  if($next.length == 0){
                    // aqui tiene que ir a buscar el proximo item visible
                    // del grupo que viene si es que existe y si no
                    // comenzar de nuevo con el primer grupo
                    nextgroup = 0;
                    nextgroup = methods.nextgroupCalc($el, currentGroup, allgroups.length);
                    if(nextgroup!=0){
                      // si el primer item es visible seleccionalo,
                      // sino selecciona el siguiente
                      $item = $el.find('.group-content:eq(' + nextgroup + ')').find('.option:eq(0)');
                      if($item.is(':visible')){
                        $item.addClass('selected');
                      }else{
                        $next = $item.nextAll('.option:visible:first');
                        $next.addClass('selected');
                      }
                    }else{
                      $item = $el.find('.group-content:eq(0)').find('.option:eq(0)');
                      if($item.is(':visible')){
                        $item.addClass('selected');
                      }else{
                        $next = $item.nextAll('.option:visible:first');
                        $next.addClass('selected');
                      }
                    }
                  }
                }else{
                  // si el primer grupo es visible parte de ahi
                  // si no es visible selecciona el siguiente
                  // grupo visible

                  let firstGroup = $el.find('.group-content:eq(0)');
                  nextgroup = 0;
                  if(firstGroup.children(':visible').length == 0){
                    nextgroup = methods.nextgroupCalc($el, currentGroup, allgroups.length);
                  }
                  if(nextgroup!=0){
                    // si el primer item es visible seleccionalo,
                    // sino selecciona el siguiente
                    $item = $el.find('.group-content:eq(' + nextgroup + ')').find('.option:eq(0)');
                    if($item.is(':visible')){
                      $item.addClass('selected');
                    }else{
                      $next = $item.nextAll('.option:visible:first');
                      $next.addClass('selected');
                    }
                  }else{
                    $item = $el.find('.group-content:eq(0)').find('.option:eq(0)');
                    if($item.is(':visible')){
                      $item.addClass('selected');
                    }else{
                      $next = $item.nextAll('.option:visible:first');
                      $next.addClass('selected');
                    }
                  }

                }
                break;
            case 38:
                // up
                // Primero reconoce si parte desde cero
                // o si ya existe un item seleccionado
                if(currentSelectedItem != -1){
                  $item = $el.find('.group-content:eq(' + currentGroup + ')').find('.option:eq(' + currentSelectedItem + ')');
                  $prev = $item.prevAll('.option:visible:first');

                  $el.find('.options .option').removeClass('selected');
                  $prev.addClass('selected');

                  if($prev.length == 0){
                    // aqui tiene que ir a buscar el anterior item visible
                    // del grupo anterior si es que existe y si no
                    // comenzar de nuevo desde el ultimo grupo
                    prevgroup = methods.prevgroupCalc($el, currentGroup, allgroups.length);
                    if(prevgroup!=allgroups.length){
                      // si el ultimo item es visible seleccionalo,
                      // sino selecciona el anterior
                      $item = $el.find('.group-content:eq(' + prevgroup + ')').find('.option:eq(-1)');
                      if($item.is(':visible')){
                        $item.addClass('selected');
                      }else{
                        $prev = $item.prevAll('.option:visible:first');
                        $prev.addClass('selected');
                      }
                    }else{
                      $item = $el.find('.group-content:eq(-1)').find('.option:eq(-1)');
                      if($item.is(':visible')){
                        $item.addClass('selected');
                      }else{
                        $prev = $item.prevAll('.option:visible:first');
                        $prev.addClass('selected');
                      }
                    }
                  }

                }else{
                  // si el ultimo grupo es visible parte de ahi
                  // si no es visible selecciona el anterior
                  // grupo visible

                  let lastGroup = $el.find('.group-content:eq(-1)');
                  prevgroup = allgroups.length;
                  if(lastGroup.children(':visible').length == 0){
                    currentGroup = allgroups.length;
                    prevgroup = methods.prevgroupCalc($el, currentGroup, allgroups.length);
                  }
                  if(prevgroup!=allgroups.length){
                    // si ultimo item es visible seleccionalo,
                    // sino selecciona el anterior
                    console.log("ultimo");
                    $item = $el.find('.group-content:eq(' + prevgroup + ')').find('.option:eq(-1)');
                    if($item.is(':visible')){
                      $item.addClass('selected');
                    }else{
                      $prev = $item.prevAll('.option:visible:first');
                      $prev.addClass('selected');
                    }
                  }else{
                    $item = $el.find('.group-content:eq(-1)').find('.option:eq(-1)');
                    if($item.is(':visible')){
                      $item.addClass('selected');
                    }else{
                      $next = $item.prevAll('.option:visible:first');
                      $next.addClass('selected');
                    }
                  }
                }
                break;
            case 13:
                // enter
                let selectedId = $el.find('.options .selected').data('id');
                events.selectOption(selectedId, $el, options);
                break;
        }
        methods.updateScroll($el);

      })
    },
    destroyShortcuts: function($el){
      $el.unbind('keydown');
    },
    clearSearch: function($el, options){
      let $search = $el.find('.search input');
      let $clear = $el.find('.clear');
      $clear.on({
        click: function(event){
          $search.val('');
          methods.hideOptions($el, $search.val(), options);
          ($search.val().length > 0) ? $clear.removeClass('hide') : $clear.addClass('hide');
          ($search.val().length > 0) ? $search.removeClass('glass') : $search.addClass('glass');

          // restart contents
          api.restart($el, true);
        }
      })
    },
    clickOption: function($el, options){
      let $options = $el.find('.options .option');
      let $search = $el.find('.search input');
      $options.on({
        click: function(event){
          event.preventDefault();
          event.stopPropagation();
          let selectedId = $(event.target).parent().data('id');
          events.selectOption(selectedId, $el, options);
        }
      })
    },
    selectOption: function(selectedId, $el, options){
      let $options = $el.find('.options .option');
      // mark as selected
      $options.removeClass('selected');
      let selectedDiv = $el.find('.options .option[data-id="' + selectedId + '"]');
      methods.showSelected( $el, selectedDiv, options );
      // hide options
      $el.find('.options').addClass('hide');  // opcion si oculta o no opciones al seleccionar 1
      selectedDiv.addClass('selected');
      api.val($el);
    },
    clickOut: function($el, options){
      let $content = $el.find('content');
      let $options = $el.find('content > .options');
      let $clear = $el.find('.clear');
      $(document).mouseup(function (e)
      {
          if (!$el.is(e.target) // if the target of the click isn't the $el...
              && $el.has(e.target).length === 0) // ... nor a descendant of the $el
          {
              $options.addClass('hide');
              $clear.addClass('hide')
              $content.removeClass('shadowUp').removeClass('shadowDown')
          }
      });
    },
    updatePosition: function($el){
      let $parentScroll = methods.getPreviousParentScroll($el);
      $(document).on( 'scroll', $parentScroll[0].tagname, function(){
        methods.setPosition($el)
      });
    }

  };


  // jquery component stuff
  $.fn.dwTypeahead = function(methodOrOptions) {
      if ( api[methodOrOptions] ) {
          return api[ methodOrOptions ].apply( this, Array.prototype.slice.call( arguments, 1 ))
      } else if ( typeof methodOrOptions === 'object' || ! methodOrOptions ) {
          // Default to "init"
          return api.init.apply( this, arguments )
      } else {
          $.error( 'Method ' +  methodOrOptions + ' does not exist on jQuery.dwTypeahead' )
      }
  };


})( jQuery )
