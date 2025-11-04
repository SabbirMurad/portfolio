function changeNavbar(event) {
    let item = event.currentTarget;
    let wrapper = item.parentElement;

    let preSelected = wrapper.querySelector('.item.selected');
    preSelected.style.width = `${20 + 36}px`;
    preSelected.classList.remove('selected');

    item.classList.add('selected');
    item.style.width = `${item.getAttribute('full-width')}px`;

    let preItemName = preSelected.getAttribute('item-name');
    let itemName = item.getAttribute('item-name');

    let preContent = document.querySelector(`#${preItemName}`);
    let content = document.querySelector(`#${itemName}`);

    if (content === null) return;

    preContent.style.opacity = 0;
    content.style.display = 'flex';
    setTimeout(() => {
        preContent.style.display = 'none';
        content.style.opacity = 1;
    }, 272);
}

window.addEventListener("load", () => {
    let navBar = document.querySelector('bottom-navigator');
    let navItems = navBar.querySelectorAll('.item');

    for (let item of navItems) {
        if (item.classList.contains('selected')) {
            item.setAttribute('full-width', item.clientWidth + 18);
            item.style.width = `${item.clientWidth + 18}px`;
        }
        else {
            item.setAttribute('full-width', item.clientWidth);
            item.style.width = `${20 + 36}px`; // 20px icon + 18px padding
        }
    }

    navBar.style.opacity = 1;
})
