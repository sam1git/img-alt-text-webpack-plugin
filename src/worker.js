// fetch alt text for dynamically loaded images and set alt attribute for corresponding <img> elements
async function fetchAltText(imageElement) {
    const fileName = imageElement.src.split('/').pop();
    try {
        const response = await fetch(`/alttext?file=${fileName}`);
        const text = await response.text();
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        } else {
            imageElement.setAttribute('alt', text);
        }
    } catch (error) {
        console.error('Error fetching alt text:', error);
    }
}

// Function to handle newly added <img> elements
function handleNewImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (!img.hasAttribute('data-processed')) {
            img.setAttribute('data-processed', 'true');
            const altText = img.getAttribute('alt');
            // if alt attribute is missing or is just space characters
            if (!altText || /^\s*$/.test(altText)) {
                fetchAltText(img);
            }
        }
    });
}

// Create an observer to watch for DOM changes
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
            handleNewImages();
        }
    });
});

// Start observing the document body for changes
observer.observe(document.body, { childList: true, subtree: true });

// Handle existing images on page load
handleNewImages();