let signInBtn = document.getElementById('sign-in-btn');

signInBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    let email = document.querySelector('input#email-address').value;
    let password = document.querySelector('input#password').value;

    if (email.length == 0) {
        toast.setNotification({
            type: 'error',
            message: 'Please enter your email address'
        });
        return;
    }

    if (password.length == 0) {
        toast.setNotification({
            type: 'error',
            message: 'Please enter your password'
        });
        return;
    }

    let response = await Fetcher.post({
        endpoint: '/auth/sign-in',
        body: {
            email_or_username: email,
            password: password
        }
    })

    console.log(response);
})