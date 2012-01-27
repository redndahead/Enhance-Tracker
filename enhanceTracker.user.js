// ==UserScript==
// @name           Enhance Tracker
// @namespace      http://redndahead.com/enhanceTracker
// @description    Add show/hide controls for loading each issue in an iframe
// @include        http://drupal.org/user/*/track*
// @include        https://drupal.org/user/*/track*
// ==/UserScript==

/**
 * Content Scope Runner.
 *
 * While Firefox/GreaseMonkey supports advanced DOM manipulations, Chrome does
 * not. For maximum browser compatibility, this user script injects itself into
 * the page it is executed on.
 *
 * Support and available features for user scripts highly varies across browser
 * vendors. Some browsers (e.g., Firefox) require to install a browser extension
 * (GreaseMonkey) in order to install and execute user scripts. Some others
 * have built-in support for user scripts, but do not support all features of
 * GreaseMonkey (variable storage, cross-domain XHR, etc). In the special case
 * of Chrome, user scripts are executed before the DOM has been fully loaded and
 * initialized; they can only access and manipulate the plain DOM document as
 * is, but none of the scripts on the actual page are loaded yet.
 *
 * Bear in mind, with Content Scope Runner, unsafeWindow and all other
 * GreaseMonkey specific features are not available.
 *
 * The global __PAGE_SCOPE_RUN__ variable is prepended to the user script to
 * control execution. Make sure this variable does not clash with actual page
 * variables.
 *
 * @see http://userscripts.org/scripts/show/68059
 * @see http://wiki.greasespot.net/Content_Scope_Runner
 *
 * @todo FIXME upstream:
 *   - Bogus SCRIPT type attribute.
 *   - data attribute throws MIME type warning in Chrome; textContent approach
 *     of earlier versions is correct.
 *   - Append to HEAD.
 *   - Removal/clean-up is completely invalid.
 *   - setTimeout() approach seems useless?
 *   - Code comments.
 */
// If not already running in the page, inject this script into the page.
if (typeof __PAGE_SCOPE_RUN__ == 'undefined') {
  // Define a closure/function in the global scope in order to reference the
  // function caller (the function that executes the user script itself).
  (function page_scope_runner() {
    // Retrieve the source of this user script.
    var self_src = '(' + page_scope_runner.caller.toString() + ')();';

    // Add the source to a new SCRIPT DOM element; prepend it with the
    // __PAGE_SCOPE_RUN__ marker.
    // Intentionally no scope-wrapping here.
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.textContent = "var __PAGE_SCOPE_RUN__ = true;\n" + self_src;

    // Inject the SCRIPT element into the page.
    // Use setTimeout to force execution "outside" of
    // the user script scope completely.
    var head = document.getElementsByTagName('head')[0];
    head.appendChild(script);
  })();

  // End execution. This code path is only reached in a GreaseMonkey/user
  // script environment.
  return;
}

// @todo Implement closure to provide jQuery in $.

// If we are in a GreaseMonkey environment and JavaScript is disabled, user
// scripts are executed nevertheless and can still act on the DOM, but none of
// the scripts on the actual page are executed. Cancel processing in this case.
// Drupal is also undefined when drupal.org is down.
// @todo Verify whether this still applies.
if (typeof Drupal == 'undefined') {
  return;
}

//the status of overlay box
var isOpen = false;

//function to display the box
function showOverlayBox() {
  //if box is not set to open then don't do anything
  if( isOpen == false ) return;
  // set the properties of the overlay box, the left and top positions
  jQuery('.overlayBox').css({
    display:'block',
    left:( jQuery(window).width() - jQuery('.overlayBox').width() )/2,
    top: '0',
    position:'absolute'
  });
  // set the window background for the overlay. i.e the body becomes darker
  jQuery('.bgCover').css({
    display:'block',
    width: jQuery(window).width(),
    height:"100%"
  });
}

// Launches the overlay
function doOverlayOpen() {
  //set status to open
  isOpen = true;
  showOverlayBox();
  jQuery('.bgCover').css({opacity:0}).animate( {opacity:0.5, backgroundColor:'#000'} );
  // dont follow the link : so return false.
  return false;
}

// Closes the overlay
function doOverlayClose() {
  //set status to closed
  isOpen = false;
  jQuery('.overlayBox').css( 'display', 'none' );
  // now animate the background to fade out to opacity 0
  // and then hide it after the animation is complete.
  jQuery('.bgCover').animate( {opacity:0}, null, null, function() {
    jQuery(this).hide();
  });
  window.location.reload()
  return false;
}

var overlayHeight = jQuery(window).height() - 50;
var overlayWidth = jQuery(window).width() - 40

// Attach overlay to the body.
jQuery('body').append('<div class="bgCover">&nbsp;</div><div class="overlayBox"><div class="overlayContent"><div class="controls"><a class="overlay-close" href="#">Close</a></div><iframe src="" width="100%" height="' + (overlayHeight - 20) + '"></iframe></div></div>');

// Style the overlay
jQuery('.overlayBox').css({
  'border': '5px solid #09F',
  'position': 'absolute',
  'display': 'none',
  'width': overlayWidth,
  'height': overlayHeight,
  'background': '#fff',
  'z-index': 40
});

jQuery('.bgCover').css({
  'background': '#000',
  'position': 'absolute',
  'left': '0',
  'top': '0',
  'display': 'none',
  'overflow': 'hidden',
  'z-index' : 40
});


// Make close link actually close.
jQuery('a.overlay-close').click(doOverlayClose);

// Close if the user hits escape
jQuery(document).keyup(function(e) {
  if (e.keyCode == 27 && isOpen) { doOverlayClose() }
});


// Add show link to each page.
jQuery('#tracker table tbody tr').each(function() {
  var issueRow = jQuery(this);
  var issueLink = issueRow.find('td:eq(0)');

  // Add the show issue link
  var oldText = issueLink.text();
  issueLink.html('<a class="load-issue" href="#">Show ' + oldText + '</a>');

  // add click event to our show link.
  issueLink.parent().find('a.load-issue').click(function() {
    // Get the url
    var url = jQuery(this).parent().next().find('a').attr('href');
    
    // If there is a new comment in the issue use that link since it will take us
    // straight to the new comment.
    if (issueRow.find('td:eq(3) a').length) {
      url = issueRow.find('td:eq(3) a').attr('href');
    }

    // Set the iframe src to our url.
    jQuery('.overlayContent iframe').attr('src', url);

    // Open the overlay.
    doOverlayOpen();

    return false;
  });
});
