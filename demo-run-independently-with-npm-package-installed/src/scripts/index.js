window.onload = function() {
    const container = document.getElementById('container');

    // add two img elements to the document without alt attribute set
    const img1 = document.createElement('img');
    img1.setAttribute('src', './logo.png');
    container.appendChild(img1);

    const img2 = document.createElement('img');
    img2.setAttribute('src', './imageWithRandomName.png');
    container.appendChild(img2);
};
