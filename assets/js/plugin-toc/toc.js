// Parameters
{{ with .Scratch.Get "plugin-toc.Parameters" -}}
const TOC_SOURCE_SANDBOX = '{{ .TOC.SourceSandbox }}';
const TOC_TITLE_TEXT = '{{ .TOC.TitleText }}';
const TOC_CONTAINER_PARENT_SEL = '{{ .TOC.ContainerParent }}';
const TOC_TOGGLE_PARENT_SEL = '{{ .TOC.ToggleParent }}';
const TOC_TOGGLE_TEXT = '{{ .TOC.ToggleText }}';
const TOC_SECTION_NUMBERS = {{ .TOC.SectionNumbers }};
const TOC_INJECT_SECTION_NUMBERS = {{ .TOC.InjectSectionNumbers }};
const TOC_WIDTH = '{{ .TOC.Style.Width }}';
{{- end }}
const HEADING_SEL = [2,3,4,5,6]
                      .map(i => `${TOC_SOURCE_SANDBOX} h${i}[id]`)
                      .join(',');
                      
{{ with site.Data.plugin_toc.specifiers -}}
// HTML element IDs
const TOC_BACKDROP_ID = '{{ .BackdropID }}';
const TOC_CONTAINER_ID = '{{ .ContainerID }}';
const TOC_HEADER_ID = '{{ .HeaderID }}';
const TOC_TITLE_ID = '{{ .TitleID }}';
const TOC_CLOSE_BUTTON_ID = '{{ .CloseButtonID }}';
const TOC_BODY_ID = '{{ .BodyID }}';
const TOC_TOGGLE_ID = '{{ .ToggleID }}';

// HTML Class Names
const TOC_LEVEL_CLASS_PREFIX = '{{ .LevelClassNamePrefix }}';
const FADE_CLASS_NAME = '{{ .FadeClassName }}';
const SHOW_CLASS_NAME = '{{ .ShowClassName }}';
const OFFSCREEN_CLASS_NAME = '{{ .OffscreenClassName }}';
const TOC_ENTRY_CLASS_NAME = '{{ .TOCEntryClassName }}';
const SECTION_NUMBER_CLASS_NAME = '{{ .SectionNumberClassName }}';
{{- end }}

// Property symbols
const TOC_BACKDROP_ELEMENT = Symbol(TOC_BACKDROP_ID);
const TOC_CONTAINER_ELEMENT = Symbol(TOC_CONTAINER_ID);
const TOC_VISIBLE = Symbol();
const GESTURE = Symbol();

const ALWAYS_OFFSCREEN = true;

document.addEventListener('DOMContentLoaded', () => {

  insertTOC(document.querySelector(TOC_CONTAINER_PARENT_SEL));
    
});

/*
  Generate the elements composing table of contents and prepend
  the container to the specified parent element.
*/
function insertTOC(parent) {
  
  // Short circuit if parent is falsy.
  if (!parent) { return; }
  
  // Create the container for the table of contents.
  let container = document.createElement('DIV');
  
  // Store the element for easy access.
  document[TOC_CONTAINER_ELEMENT] = container;
  
  // Set the ID.
  container.id = TOC_CONTAINER_ID;
  
  // Remove the container from tab navigation.
  container.tabIndex = '-1';
  
  // Specify its label.
  container.setAttribute('aria-labelledby', TOC_TITLE_ID);


  let geometry = parent.getBoundingClientRect();
    
  // Check whether the TOC is wider than its parent.
  if (geometry.width < TOC_WIDTH || ALWAYS_OFFSCREEN) {
    
    // Create and attach the backdrop.
    let backdrop = createBackdrop();

    // Prepend the backdrop.
    parent.prepend(backdrop);
    
    // Add the offscreen class to the container.
    container.className = OFFSCREEN_CLASS_NAME;
    
    // Initialize the property storing the state.
    document[TOC_VISIBLE] = false;
    
    // Insert the button for toggling the TOC.
    insertTOCToggle(document.querySelector(TOC_TOGGLE_PARENT_SEL));

    // Hide the TOC on selection.
    window.onhashchange = () => hideTOC();
          
    // Add the swipe gesture for touch screen devices.
    if ('ontouchstart' in window) 
    {
      document.body[GESTURE] = 
          new SwipeGesture(document.body, showTOC, [LEFT_EDGE]);
    }
  }
  
  // Otherwise, configure for occupying the parent.
  else {
    
    // Initialize the property storing the state.
    document[TOC_VISIBLE] = true;
  }
    
  // Create the header element
  let header = document.createElement('HEADER');
  header.id = TOC_HEADER_ID;
  
  // Create the table of contents title.
  let title = document.createElement('H2');
  title.id = TOC_TITLE_ID;
  title.innerHTML = `<nobr>${TOC_TITLE_TEXT}</nobr>`;
  
  // Append the title to the header and the header to the container.
  header.append(title);
  
  
  header.append(createCloseButton());
  
  container.append(header);
  
  // Create the <nav> element that will contain the links.
  let body = document.createElement('NAV');
  body.id = TOC_BODY_ID;
  
  // Append the nav element to the container.
  container.append(body);
  
  // Prepend the container.
  parent.prepend(container);
  
  // Fetch eligible headings for link generation.
  let headings = document.querySelectorAll(HEADING_SEL);
    
  // Create an array for section number tallying.
  let sectionNumbers = [0,0,0,0,0];
  
  // Iterate the headings, which should all have IDs courtesy of
  // the selector used to fetch them.
  for (let heading of headings) {
   
    // Parse the heading level, subtracting one as we 
    // never include <h1> headings.
    let level = parseInt(heading.tagName.charAt(1)) - 1;
    
    // Increment the number for this level.
    sectionNumbers[level - 1]++;
    
    // Zero out lower section numbers.
    for (let i = level; i < sectionNumbers.length; i++) { 
      sectionNumbers[i] = 0; 
    }
    
    // Generate the section number.
    let sectionNumber = sectionNumbers.slice(0, level).join('.');
    
    // Create the entry.
    let entry = document.createElement('DIV');
    entry.classList.add(TOC_ENTRY_CLASS_NAME);
    entry.classList.add(`${TOC_LEVEL_CLASS_PREFIX}${level}`);
        
    // Create the number element.
    let number = document.createElement('SPAN');
    number.innerHTML = sectionNumber;
    number.className = SECTION_NUMBER_CLASS_NAME;
    
    // Create the anchor element.
    let link = document.createElement('A');
    link.href = `#${heading.id}`;
    link.innerHTML = heading.innerHTML;
    
    if (TOC_SECTION_NUMBERS) { entry.append(number); }
    
    entry.append(link);
        
    // Append the anchor to the <nav> element.
    body.append(entry);
    
    if (TOC_INJECT_SECTION_NUMBERS) {
      // Insert the section number into the heading.
      heading.innerHTML = `<b><i>${sectionNumber}</i></b> ${heading.innerHTML}`;
    }
    
  }
  
  function createCloseButton() {
    let button = document.createElement('BUTTON');
    button.id = TOC_CLOSE_BUTTON_ID;
    button.type = 'button';
    button.onclick = () => hideTOC();
    
    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', true);
    svg.setAttribute('focusable', false);
    svg.setAttribute('role', 'img');
    svg.setAttribute('viewBox', '0 0 512 512');
    
    let g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.append(g);
    
    let secondaryPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    secondaryPath.className = 'secondary';
    secondaryPath.setAttribute('fill', 'currentColor');
    secondaryPath.setAttribute('opacity', 0.4);
    secondaryPath.setAttribute('d', '\
M464 32H48A48 48 0 0 0 0 80v352a48 48 0 0 0 48 \
48h416a48 48 0 0 0 48-48V80a48 48 0 0 0-48-48zm-83.6 \
290.5a12.31 12.31 0 0 1 0 17.4l-40.5 40.5a12.31 12.31 \
0 0 1-17.4 0L256 313.3l-66.5 67.1a12.31 12.31 0 0 \
1-17.4 0l-40.5-40.5a12.31 12.31 0 0 1 \
0-17.4l67.1-66.5-67.1-66.5a12.31 12.31 0 0 1 \
0-17.4l40.5-40.5a12.31 12.31 0 0 1 17.4 0l66.5 67.1 \
66.5-67.1a12.31 12.31 0 0 1 17.4 0l40.5 40.5a12.31 \
12.31 0 0 1 0 17.4L313.3 256z');

    g.append(secondaryPath);
    
    let primaryPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    primaryPath.className = 'primary';
    primaryPath.setAttribute('fill', 'currentColor');
    primaryPath.setAttribute('d', '\
M380.4 322.5a12.31 12.31 0 0 1 0 17.4l-40.5 \
40.5a12.31 12.31 0 0 1-17.4 0L256 313.3l-66.5 \
67.1a12.31 12.31 0 0 1-17.4 0l-40.5-40.5a12.31 \
12.31 0 0 1 0-17.4l67.1-66.5-67.1-66.5a12.31 12.31 \
0 0 1 0-17.4l40.5-40.5a12.31 12.31 0 0 1 17.4 0l66.5 \
67.1 66.5-67.1a12.31 12.31 0 0 1 17.4 0l40.5 \
40.5a12.31 12.31 0 0 1 0 17.4L313.3 256z');

    g.append(primaryPath);
    button.append(svg);

    return button;
  }
  
  function createBackdrop() {
    // Create the backdrop.
    let backdrop = document.createElement('DIV');
    
    // Store the element for easy access.
    document[TOC_BACKDROP_ELEMENT] = backdrop;
    
    // Set the ID.
    backdrop.id = TOC_BACKDROP_ID;
    
    // Give it the fade class so it's initially hidden.
    backdrop.className = FADE_CLASS_NAME;
    
    // Add a handler for touches/clicks.
    backdrop.onclick = () => hideTOC();
      
    return backdrop;
  }
  
}

/*
  Generate the toggle button and prepend to 
  the specified parent element.
*/
function insertTOCToggle(parent) {
  
  // Create the button.
  let toggle = document.createElement('BUTTON');
  
  // Set the ID.
  toggle.id = TOC_TOGGLE_ID;
  
  // Set the type.
  toggle.type = 'button';
  
  // Set the button's text.
  toggle.innerHTML = TOC_TOGGLE_TEXT;
  
  // Connect the button to the element it controls.
  toggle.setAttribute('aria-controls', TOC_CONTAINER_ID);
  
  // Configure the button action.
  toggle.onclick = () => document[TOC_VISIBLE] ? hideTOC() : showTOC();
    
  // append the button.
  parent.append(toggle);
  
}
  
function showTOC() {
  
  // Ensure the table of contents is not already visible.
  if (document[TOC_VISIBLE]) { return; }
  
  // Retrieve the backdrop.
  let backdrop = document[TOC_BACKDROP_ELEMENT];
    
  // Configure the backdrop for visibility.
  backdrop.classList.add(SHOW_CLASS_NAME);
  
  // Retrieve the container.
  let container = document[TOC_CONTAINER_ELEMENT];
  
  // Configure the container for visibility.
  container.removeAttribute('aria-hidden');
  container.setAttribute('aria-modal', true);
  container.setAttribute('role', 'dialog');
  container.classList.add(SHOW_CLASS_NAME);
  
  // Update the property storing the state.
  document[TOC_VISIBLE] = true;
  
}

function hideTOC() {
  
  // Ensure the table of contents is actually visible.
  if (!document[TOC_VISIBLE]) { return; }
  
  // Retrieve the backdrop.
  let backdrop = document[TOC_BACKDROP_ELEMENT];
    
  // Configure the backdrop for invisibility.
  backdrop.classList.remove(SHOW_CLASS_NAME);
  
  // Retrieve the container.
  let container = document[TOC_CONTAINER_ELEMENT];
  
  // Configure the container for invisibility.
  container.setAttribute('aria-hidden', true);
  container.removeAttribute('aria-modal');
  container.removeAttribute('role');
  container.classList.remove(SHOW_CLASS_NAME);
  
  // Update the property storing the state.
  document[TOC_VISIBLE] = false;
  
}

class Touch {
  
  constructor() {    
    this.isDown = false;
    this.inLeft = false;
    this.inRight = false;
    this.timestamp = null;    
  }
  
}

class Threshold {
  
  constructor(width, ms) {    
    this.width = width;
    this.start = 0.2 * width;
    this.end = 0.3 * width;
    this.ms = ms;    
  }
  
  resize(width) {    
    this.width = width;
    this.start = 0.2 * width;
    this.end = 0.3 * width;    
  }
  
}

const LEFT_EDGE = Symbol();
const RIGHT_EDGE = Symbol();
const EDGES = new Set([LEFT_EDGE, RIGHT_EDGE]);

class SwipeGesture {
  
  constructor(element, action, edges = EDGES) {
    
    this.element = element;
    this.action = action;
    this.threshold = new Threshold(window.innerWidth, 500);
    this.touch = new Touch();
    this.edges = new Set([...edges].filter(edge => EDGES.has(edge)));
    
    document.addEventListener('resize', () => {      
      this.threshold.resize(window.innerWidth)      
    });
    
    element.addEventListener('touchstart', event => {
      
      let x = event.touches[0].pageX;
      this.touch.isDown = true;
      this.touch.timestamp = performance.now();
      
      if (this.edges.has(LEFT_EDGE) && x < this.threshold.start) {
        this.touch.inLeft = true;
      }
      
      else if (this.edges.has(RIGHT_EDGE) && x > this.threshold.width - this.threshold.start) {
        this.touch.inRight = true;
      }
      
    });
    
    element.addEventListener('touchmove', event => {
      
      let x = event.touches[0].pageX;
      
      if (this.touch.inLeft && x > this.threshold.end) {
        this.touch.inLeft = false;
        
        if (performance.now() - this.touch.timestamp < this.threshold.ms) {
          this._action?.('inLeft');
        }
      } 
      
      else if (this.touch.inRight && x < this.threshold.width - this.threshold.end) {
        this.touch.inRight = false;
        
        if (performance.now() - this.touch.timestamp < this.threshold.ms) {
          this._action?.('inRight');
        }
      }
      
    });

    element.addEventListener('touchend', event => {
      this.touch = new Touch();
    });

  }
  
  get action() { return _action; }
  
  set action(action) {
    this._action = typeof action === 'function' ? action : null;
  }
    
}