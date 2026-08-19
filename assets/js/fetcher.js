class Fetcher {
    /**
     * Exchange the refresh-token cookie for a fresh access-token cookie.
     * Ported from postura_rust's assets/jsx/shared.jsx (refreshAccessToken) —
     * deduped so concurrent 401s share one in-flight refresh instead of each
     * firing their own.
     * @returns {Promise<boolean>}
     */
    static #refreshInFlight = null;
    static async #refreshAccessToken() {
        if (this.#refreshInFlight) return this.#refreshInFlight;

        this.#refreshInFlight = (async () => {
            try {
                // Raw fetch, not #commonMethods — going through it would retry
                // through this same refresh path on a 401 and recurse.
                const res = await fetch((window.projectDomain || '') + "/api/auth/refresh", {
                    method: "POST",
                    credentials: "same-origin",
                });
                return res.ok;
            } catch (e) {
                return false;
            }
        })().finally(() => { this.#refreshInFlight = null; });

        return this.#refreshInFlight;
    }

    /**
     * Public passthrough to the refresh above, for code that has to issue its
     * own request and so can't ride the 401 retry built into the methods here
     * — assets/js/image-uploader.js needs XHR for upload progress. Going
     * through this rather than POSTing /api/auth/refresh directly keeps every
     * caller sharing the one in-flight refresh.
     * @returns {Promise<boolean>}
     */
    static async refreshSession() {
        return this.#refreshAccessToken();
    }

    /**
     * A multipart/form-data POST — for file uploads, where #commonMethods'
     * always-JSON body (JSON.stringify + Content-Type: application/json)
     * doesn't apply. No Content-Type is set here: the browser derives
     * multipart/form-data; boundary=... itself from the FormData body, and
     * setting it manually would drop that boundary.
     * @param {string} options.endpoint - The endpoint to send the request to.
     * @param {FormData} options.formData - The multipart body to send.
     * @param {boolean} [options.showError] - Show a toast on failure (best-effort; see #notify).
     * @param {boolean} [options._retried] - Internal — set on the retry after a 401 refresh.
     * @returns {Promise<FetchResult>}
     */
    static async upload({ endpoint, formData, showError = true, _retried = false }) {
        const url = (window.projectDomain || '') + "/api" + endpoint;

        let response;
        try {
            response = await fetch(url, {
                method: "POST",
                credentials: "same-origin",
                body: formData,
            });
        } catch (error) {
            this.#notify(showError, error.toString());
            return new FetchResult({
                ok: false,
                status: -1,
                data: null,
                error: error.toString(),
            });
        }

        if (response.status === 401 && !_retried) {
            const refreshed = await this.#refreshAccessToken();
            if (refreshed) {
                return this.upload({ endpoint, formData, showError, _retried: true });
            }
        }

        if (!response.ok) {
            let error;
            try {
                const result = await response.json();
                error = result.message || result.error || "Response Not Okay";
            } catch (e) {
                console.error(e);
                if (response.status === 400) {
                    error = "Bad request, Check the request body";
                } else if (response.status === 404) {
                    error = "Not found, Check the api route";
                } else {
                    error = "Response Not Okay";
                }
            }

            this.#notify(showError, error);
            return new FetchResult({
                ok: false,
                status: response.status,
                data: null,
                error: error,
            });
        }

        let result;
        try {
            result = await response.json();
        } catch (e) {
            console.error(e);
            this.#notify(showError, 'Error Parsing Response');
            return new FetchResult({
                ok: false,
                status: response.status,
                data: null,
                error: 'Error Parsing Response',
            });
        }

        return new FetchResult({
            ok: true,
            status: response.status,
            data: result,
            error: null,
        });
    }

    /**
     *
     * @param {string} options.endpoint - The endpoint to send the request to.
     * @param {Object} options.headers - The headers to send the request with.
     * @param {string|Object} options.body - The body to send the request with.
     * @returns {Promise<FetchResult>}
     */
    static async post({
        endpoint,
        headers = {},
        body,
        showError = true,
    }) {
        return await this.#commonMethods({
            endpoint: endpoint,
            method: "POST",
            headers: headers,
            body: body,
            showError: showError
        })
    }

    /**
     * 
     * @param {string} options.endpoint - The endpoint to send the request to.
     * @param {Object} options.headers - The headers to send the request with.
     * @param {string|Object} options.body - The body to send the request with.
     * @returns {Promise<FetchResult>}
     */
    static async put({
        endpoint,
        headers = {},
        body,
        showError = true,
    }) {
        return await this.#commonMethods({
            endpoint: endpoint,
            method: "PUT",
            headers: headers,
            body: body,
            showError: showError
        })
    }

    /**
     * 
     * @param {string} options.endpoint - The endpoint to send the request to.
     * @param {Object} options.headers - The headers to send the request with.
     * @param {string|Object} options.body - The body to send the request with.
     * @returns {Promise<FetchResult>}
     */
    static async patch({
        endpoint,
        headers = {},
        body,
        showError = true,
    }) {
        return await this.#commonMethods({
            endpoint: endpoint,
            method: "PATCH",
            headers: headers,
            body: body,
            showError: showError
        })
    }

    /**
     * 
     * @param {string} options.endpoint - The endpoint to send the request to.
     * @param {Object} options.headers - The headers to send the request with.
     * @param {Object} options.query - The query parameters to send the request with.
     * @returns {Promise<FetchResult>}
     */
    static async delete({
        endpoint,
        headers = {},
        query = {},
        showError = true,
    }) {
        let queryStr = Fetcher.#buildQuery(query);

        return await this.#commonMethods({
            endpoint: endpoint,
            method: "DELETE",
            headers: headers,
            query: queryStr,
            showError: showError
        })
    }

    /**
     * 
     * @param {string} options.endpoint - The endpoint to send the request to.
     * @param {Object} options.headers - The headers to send the request with.
     * @param {Object} options.query - The query parameters to send the request with.
     * @returns {Promise<FetchResult>}
     */
    static async get({
        endpoint,
        headers = {},
        query = {},
        showError = true,
    }) {
        let queryStr = Fetcher.#buildQuery(query);

        return await this.#commonMethods({
            endpoint: endpoint,
            method: "GET",
            headers: headers,
            query: queryStr,
            showError: showError
        })
    }

    /**
     * 
     * @param {string} options.endpoint - The endpoint to send the request to.
     * @param {string} options.method - The method to send the request with.
     * @param {Object} options.headers - The headers to send the request with.
     * @param {string|Object} options.body - The body to send the request with.
     * @param {Object} options.query - The query parameters to send the request with.
     * @returns {Promise<FetchResult>}
     */
    static async #commonMethods({
        endpoint,
        method,
        headers = {},
        body,
        query = '',
        showError = true,
        _retried = false,
    }) {
        let _headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            ...headers,
        };

        let url = (window.projectDomain || '') + "/api" + endpoint;
        if (query) {
            url += "?" + query;
        }

        let reqObject = {
            method: method,
            headers: _headers,
            // Auth rides on the httpOnly access_token/refresh_token cookies
            // (src/handler/auth.rs auth_access_cookie / auth_refresh_cookie) —
            // this is what actually sends them; JS never reads or holds them.
            credentials: "same-origin",
        };

        if (body) {
            reqObject.body = JSON.stringify(body);
        }

        let response;
        try {
            response = await fetch(url, reqObject);
        } catch (error) {
            this.#notify(showError, error.toString());
            return new FetchResult({
                ok: false,
                status: -1,
                data: null,
                error: error.toString(),
            })
        }

        // Access-token cookie expired mid-session — refresh once and retry
        // the original request before giving up. Ported from postura_rust's
        // apiFetch (assets/jsx/shared.jsx).
        if (response.status === 401 && !_retried) {
            const refreshed = await this.#refreshAccessToken();
            if (refreshed) {
                return this.#commonMethods({
                    endpoint, method, headers, body, query, showError,
                    _retried: true,
                });
            }
        }

        if (!response.ok) {
            let error;
            try {
                const result = await response.json();
                // src/utils/response.rs sends `{ message }`; the API auth
                // middleware's own rejections (src/middleware/auth.rs
                // require_access) send `{ error }` instead — check both.
                error = result.message || result.error || "Response Not Okay";
            } catch (e) {
                console.error(e);
                if (response.status === 400) {
                    error = "Bad request, Check the request body";
                } else if (response.status === 404) {
                    error = "Not found, Check the api route";
                } else {
                    error = "Response Not Okay";
                }
            }

            this.#notify(showError, error);
            return new FetchResult({
                ok: false,
                status: response.status,
                data: null,
                error: error,
            })
        }

        let result;
        try {
            result = await response.json();
        } catch (e) {
            console.error(e);
            this.#notify(showError, 'Error Parsing Response');
            return new FetchResult({
                ok: false,
                status: response.status,
                data: null,
                error: 'Error Parsing Response',
            })
        }

        return new FetchResult({
            ok: true,
            status: response.status,
            data: result,
            error: null,
        })
    }

    /**
     * Best-effort toast — the v2 pages (sign-in, sign-up, dashboard) don't
     * load the toast component and read `FetchResult.error` themselves
     * instead, so this silently no-ops there rather than throwing on a
     * missing `toast` global.
     */
    static #notify(showError, message) {
        if (!showError) return;
        if (typeof toast === 'undefined' || !toast.setNotification) return;
        toast.setNotification({ type: 'error', message });
    }

    /**
     * `{ a: 1, b: [2, 3] }` -> `"a=1&b=2&b=3"`. The previous version appended
     * each non-array value twice (once unconditionally, once in the `else`
     * branch) — fixed here, and values are now URI-encoded.
     */
    static #buildQuery(query) {
        const parts = [];
        for (let key in query) {
            const value = query[key];
            if (Array.isArray(value)) {
                for (let item of value) {
                    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
                }
            } else {
                parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            }
        }
        return parts.join('&');
    }
}

class FetchResult {
    constructor({
        ok,
        status,
        data,
        error
    }) {
        this.ok = ok;
        this.status = status;
        this.data = data;
        this.error = error;
    }
}

window.addEventListener("load", () => {
    window.Fetcher = Fetcher;
});