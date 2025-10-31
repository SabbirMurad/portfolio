function changeNavbar(event) {
    let item = event.currentTarget;
    let wrapper = item.parentElement;

    let preSelected = wrapper.querySelector('.item.selected');
    preSelected.style.width = `${20+36}px`;
    preSelected.classList.remove('selected');

    item.classList.add('selected');
    item.style.width = `${item.getAttribute('full-width')}px`;
}

window.addEventListener("load", () => {
    let navBar = document.querySelector('bottom-navigator');
    let navItems = navBar.querySelectorAll('.item');

    for (let item of navItems) {
        console.log(item.clientWidth);
        
        if (item.classList.contains('selected')) {
            item.setAttribute('full-width', item.clientWidth + 18);
            item.style.width = `${item.clientWidth + 18}px`;
        }
        else {
            item.setAttribute('full-width', item.clientWidth);
            item.style.width = `${20 +36}px`; // 20px icon + 18px padding
        }
    }

    navBar.style.opacity = 1;
})