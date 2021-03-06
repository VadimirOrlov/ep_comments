var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');
var commentBoxes = require('ep_comments_page/static/js/commentBoxes');

// Indicates if Etherpad is configured to display icons
var displayIcons = function() {
  return clientVars.displayCommentAsIcon
}

// Easier access to outer pad
var padOuter;
var getPadOuter = function() {
  padOuter = padOuter || $('iframe[name="ace_outer"]').contents();
  return padOuter;
}

// Easier access to inner pad
var padInner;
var getPadInner = function() {
  padInner = padInner || getPadOuter().find('iframe[name="ace_inner"]').contents();
  return padInner;
}

var getOrCreateIconsContainerAt = function(top) {
  var iconContainer = getPadOuter().find('#commentIcons');
  var iconClass = "icon-at-"+top;

  // is this the 1st comment on that line?
  var iconsAtLine = iconContainer.find("."+iconClass);
  var isFirstIconAtLine = iconsAtLine.length === 0;

  // create container for icons at target line, if it does not exist yet
  if (isFirstIconAtLine) {
    iconContainer.append('<div class="comment-icon-line '+iconClass+'"></div>');
    iconsAtLine = iconContainer.find("."+iconClass);
    iconsAtLine.css("top", top+"px");
  }

  return iconsAtLine;
}

var targetCommentIdOf = function(e) {
  return e.currentTarget.getAttribute("data-commentid");
}

var highlightTargetTextOf = function(commentId) {
  getPadInner().find("head").append("<style class='comment-style'>."+commentId+"{ color: #a7680c !important }</style>");
}

var removeHighlightTargetText = function(commentId) {
  getPadInner().find("head .comment-style").remove();
}

var toggleActiveCommentIcon = function(target) {
  target.toggleClass("active").toggleClass("inactive");
}

var addListenersToCommentIcons = function() {
  getPadOuter().find('#commentIcons').on("mouseover", ".comment-icon", function(e){
    removeHighlightTargetText();
    var commentId = targetCommentIdOf(e);
    highlightTargetTextOf(commentId);
  }).on("mouseout", ".comment-icon", function(e){
    var commentId = targetCommentIdOf(e);
    removeHighlightTargetText();
  }).on("click", ".comment-icon.active", function(e){
    toggleActiveCommentIcon($(this));

    var commentId = targetCommentIdOf(e);
    commentBoxes.hideComment(commentId, true);
  }).on("click", ".comment-icon.inactive", function(e){
    // deactivate/hide other comment boxes that are opened, so we have only
    // one comment box opened at a time
    commentBoxes.hideAllComments();
    var allActiveIcons = getPadOuter().find('#commentIcons').find(".comment-icon.active");
    toggleActiveCommentIcon(allActiveIcons);

    // activate/show only target comment
    toggleActiveCommentIcon($(this));
    var commentId = targetCommentIdOf(e);
    commentBoxes.highlightComment(commentId, e);
  });
}

// Listen to clicks on the page to be able to close comment when clicking
// outside of it
var addListenersToCloseOpenedComment = function() {
  // we need to add listeners to the different iframes of the page
  $(document).on("touchstart click", function(e){
    closeOpenedCommentIfNotOnSelectedElements(e);
  });
  getPadOuter().find('html').on("touchstart click", function(e){
    closeOpenedCommentIfNotOnSelectedElements(e);
  });
  getPadInner().find('html').on("touchstart click", function(e){
    closeOpenedCommentIfNotOnSelectedElements(e);
  });
}

// Close comment if event target was outside of comment or on a comment icon
var closeOpenedCommentIfNotOnSelectedElements = function(e) {
  // Don't do anything if clicked on the following elements:
  if (shouldNotCloseComment(e) // any of the comment icons
    || commentBoxes.shouldNotCloseComment(e)) { // a comment box or the comment modal
    return;
  }

  // All clear, can close the comment
  var openedComment = findOpenedComment();
  if (openedComment) {
    toggleActiveCommentIcon($(openedComment));

    var commentId = openedComment.getAttribute("data-commentid");
    commentBoxes.hideComment(commentId, true);
  }
}

// Search on the page for an opened comment
var findOpenedComment = function() {
  return getPadOuter().find('#commentIcons .comment-icon.active').get(0);
}

/* ***** Public methods: ***** */

// Create container to hold comment icons
var insertContainer = function() {
  // we're only doing something if icons will be displayed at all
  if (!displayIcons()) return;

  getPadOuter().find("#sidediv").after('<div id="commentIcons"></div>');
  getPadOuter().find("#comments").addClass('with-icons');
  addListenersToCommentIcons();
  addListenersToCloseOpenedComment();
}

// Create a new comment icon
var addIcon = function(commentId, comment){
  // we're only doing something if icons will be displayed at all
  if (!displayIcons()) return;

  var inlineComment = getPadInner().find(".comment."+commentId);
  var top = inlineComment.get(0).offsetTop;
  var iconsAtLine = getOrCreateIconsContainerAt(top);
  var icon = $('#commentIconTemplate').tmpl(comment);

  icon.appendTo(iconsAtLine);
}

// Hide comment icons from container
var hideIcons = function() {
  // we're only doing something if icons will be displayed at all
  if (!displayIcons()) return;

  getPadOuter().find('#commentIcons').children().children().each(function(){
    $(this).hide();
  });
}

// Adjust position of the comment icon on the container, to be on the same
// height of the pad text associated to the comment, and return the affected icon
var adjustTopOf = function(commentId, baseTop) {
  // we're only doing something if icons will be displayed at all
  if (!displayIcons()) return;

  var icon = getPadOuter().find('#icon-'+commentId);
  var targetTop = baseTop;
  var iconsAtLine = getOrCreateIconsContainerAt(targetTop);

  // move icon from one line to the other
  if (iconsAtLine != icon.parent()) icon.appendTo(iconsAtLine);

  icon.show();

  return icon;
}

// Indicate if comment detail currently opened was shown by a click on
// comment icon.
var isCommentOpenedByClickOnIcon = function() {
  // we're only doing something if icons will be displayed at all
  if (!displayIcons()) return false;

  var iconClicked = getPadOuter().find('#commentIcons').find(".comment-icon.active");
  var commentOpenedByClickOnIcon = iconClicked.length !== 0;

  return commentOpenedByClickOnIcon;
}

// Mark comment as a comment-with-reply, so it can be displayed with a
// different icon
var commentHasReply = function(commentId) {
  // we're only doing something if icons will be displayed at all
  if (!displayIcons()) return;

  // change comment icon
  var iconForComment = getPadOuter().find('#commentIcons').find("#icon-"+commentId);
  iconForComment.addClass("with-reply");
}

// Indicate if sidebar comment should be shown, checking if it had the characteristics
// of a comment that was being displayed on the screen
var shouldShow = function(sidebarComent) {
  var shouldShowComment = false;

  if (!displayIcons()) {
    // if icons are not being displayed, we always show comments
    shouldShowComment = true;
  } else if (sidebarComent.hasClass("mouseover")) {
    // if icons are being displayed, we only show comments clicked by user
    shouldShowComment = true;
  }

  return shouldShowComment;
}

// Indicates if event was on one of the elements that does not close comment (any of the comment icons)
var shouldNotCloseComment = function(e) {
  return $(e.target).closest('.comment-icon').length !== 0;
}

exports.insertContainer = insertContainer;
exports.addIcon = addIcon;
exports.hideIcons = hideIcons;
exports.adjustTopOf = adjustTopOf;
exports.isCommentOpenedByClickOnIcon = isCommentOpenedByClickOnIcon;
exports.commentHasReply = commentHasReply;
exports.shouldShow = shouldShow;
exports.shouldNotCloseComment = shouldNotCloseComment;
