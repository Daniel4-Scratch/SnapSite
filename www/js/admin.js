getUserList = function (query, pageSize, page, callback) {
    SnapCloud.withCredentialsRequest(
        'GET',
        '/users?' +
            (query ? 'matchtext=' + encodeURIComponent(query) + '&' : '' ) +
            'pagesize=' + pageSize + '&page=' + page,
        callback,
        genericError,
        'Could not fetch user list'
    );
}

userButton = function (user, label, action, extraClass) {
    var button = document.createElement('a');
    button.classList.add('pure-button');
    button.classList.add(label.toLowerCase().replace(/\s/g,''));
    if (extraClass) {
        button.classList.add(extraClass);
    }
    button.innerHTML = localizer.localize(label);
    button.onclick = action;
    return button;
}

verifyButton = function (user) {
    return userButton(
        user,
        'Verify',
        function () {
            SnapCloud.withCredentialsRequest(
                'GET',
                '/users/' + encodeURIComponent(user.username) + '/verify_user/0', // token is irrelevant for admins
                function (response) {
                    alert(
                        response,
                        function () {
                            location.href = 'user.html?user=' + encodeURIComponent(user.username);
                        }
                    );
                },
                genericError,
                'Could not verify user'
            );
        }
    );
};

blockButton = function (user) {
    return userButton(
        user,
        user.role == 'banned' ? 'Unblock' : 'Block',
        function () {
            confirm(
                localizer.localize('Are you sure you want to ' + (user.role == 'banned' ? 'unblock' : 'block') + ' user') + ' <strong>' + user.username + '</strong>?',
                function (ok) {
                    if (ok) {
                        SnapCloud.withCredentialsRequest(
                            'POST',
                            '/users/' + encodeURIComponent(user.username) + '?' + 
                                SnapCloud.encodeDict({ role: user.role == 'banned' ? 'standard' : 'banned' }),
                            function (response) {
                                alert(
                                    localizer.localize('User has been ' + (user.role == 'banned' ? 'unblocked' : 'blocked.')),
                                    function () { location.reload(); }
                                );
                            },
                            genericError,
                            'Could not block user'
                        );
                    }
                },
                confirmTitle('Block user')
            );
        }, 
        'pure-button-warning'
    );
};

deleteButton = function (user) {
    return userButton(
        user,
        'Delete',
        function () {
            confirm(
                localizer.localize('Are you sure you want to delete user') + ' <strong>' + user.username + '</strong>?<br>' +
                '<i class="warning fa fa-exclamation-triangle"></i> ' +
                localizer.localize('WARNING! This action cannot be undone!') +
                ' <i class="warning fa fa-exclamation-triangle"></i>',
                function (ok) {
                    if (ok) {
                       SnapCloud.withCredentialsRequest(
                           'DELETE',
                           '/users/' + encodeURIComponent(user.username),
                           function (response) {
                               alert(
                                   response,
                                   function () { location.reload(); }
                               );
                           },
                           genericError,
                           'Could not delete user'
                       );
                    }
                },
                confirmTitle('Delete user')
            );
        },
        'pure-button-warning'
    );
};

becomeButton = function (user) {
    return userButton(
        user,
        'Become',
        function () {
            SnapCloud.login(
                user.username,
                0, // password is irrelevant
                false, // persist
                function (username, role, response) {
                    alert(
                        response.message,
                        function () {
                            sessionStorage.username = username;
                            sessionStorage.role = role;
                            location.href = 'profile.html';
                        }
                    );
                },
                genericError
            );
        }
    );
};

canSetRole = function (currentRole, newRole) {
    // answers the question "can a sessionStorage.role turn a currentRole into a newRole?"
    var canSet = {
        admin: {
            admin: { admin: true, moderator: true, reviewer: true, standard: true, banned: true },
            moderator: { admin: true, moderator: true, reviewer: true, standard: true, banned: true },
            reviewer: { admin: true, moderator: true, reviewer: true, standard: true, banned: true },
            standard: { admin: true, moderator: true, reviewer: true, standard: true, banned: true },
            banned: { admin: true, moderator: true, reviewer: true, standard: true, banned: true }
        },
        moderator: {
            admin: {}, moderator: {},
            reviewer: { moderator: true, reviewer: true, standard: true, banned: true },
            standard: { moderator: true, reviewer: true, standard: true, banned: true },
            banned: { moderator: true, reviewer: true, standard: true, banned: true }
        },
        reviewer: {
            admin: {}, moderator: {}, reviewer: {}, banned: {},
            standard: { reviewer: true, standard: true }
        },
        standard: { admin: {}, moderator: {}, reviewer: {}, standard: {}, banned: {} },
        banned: { admin: {}, moderator: {}, reviewer: {}, standard: {}, banned: {} }
    }
    return canSet[sessionStorage.role][currentRole][newRole] || false
};

setRole = function (user, role) {
    SnapCloud.withCredentialsRequest(
        'POST',
        '/users/' + encodeURIComponent(user.username) + '?' + 
            SnapCloud.encodeDict({ role: role }),
        function (response) {
            alert(localizer.localize('User ' + user.username + ' is now ' + role + '.'));
        },
        genericError,
        'Could not set user role'
    );
};

userDiv = function (user) {
    var userWrapperDiv = document.createElement('div'),
        userDiv = document.createElement('div'),
        usernameAnchor = userAnchor(user.username),
        emailSpan = document.createElement('span'),
        idSpan = document.createElement('span'),
        joinedSpan = document.createElement('span'),
        roleSpan = document.createElement('span'),
        roleSelect = document.createElement('select'),
        buttonsDiv = document.createElement('div');

    emailSpan.innerHTML = '<em><a target="_blank" href="mailto:' + user.email + '">' + user.email + '</a></em>';
    idSpan.innerHTML = '<strong>ID:</strong> ' + user.id;
    joinedSpan.innerHTML = '<strong localizable>Joined in </strong>' + formatDate(user.created);

    roleSpan.innerHTML = '<strong localizable>Role</strong>:';
    ['standard', 'reviewer', 'moderator', 'admin', 'banned'].forEach(
        function (role) {
            var roleOption = document.createElement('option');
            roleOption.value = role;
            roleOption.innerHTML = role;
            if (role === 'banned' || !canSetRole(user.role, role)) {
                roleOption.disabled = true;
            }
            if (user.role == role) {
                roleOption.selected = true;
            }
            roleSelect.appendChild(roleOption); 
        }
    );
    roleSelect.onchange = function () { setRole(user, roleSelect.value) };
    roleSpan.appendChild(roleSelect);

    userWrapperDiv.classList.add('user');
    userWrapperDiv.classList.add('pure-u-1-3');
    userDiv.classList.add('details');

    buttonsDiv.classList.add('buttons');

    [usernameAnchor, emailSpan, idSpan, joinedSpan, roleSpan, buttonsDiv].forEach(function (e) { userDiv.appendChild(e); });

    if (user.role == 'admin') {
        userDiv.classList.add('admin');
        userDiv.title += localizer.localize('Administrator') + '\n';
    } else if (user.role == 'banned') {
        userDiv.classList.add('banned');
        userDiv.title += localizer.localize('Banned') + '\n';
    }

    if (!user.verified) {
        buttonsDiv.appendChild(verifyButton(user));
        userDiv.classList.add('unverified');
        userDiv.title += localizer.localize('User is not verified');
    }

    if (sessionStorage.role == 'admin') {
        buttonsDiv.appendChild(becomeButton(user));
    }

    if (canSetRole(user.role, 'banned')) {
        buttonsDiv.appendChild(blockButton(user));
    }

    if (sessionStorage.role == 'admin' ||
            sessionStorage.username == user.username) {
        buttonsDiv.appendChild(deleteButton(user));
    }

    userWrapperDiv.appendChild(userDiv);
    return userWrapperDiv;
}
