
"use client";

import ThirdParty from "supertokens-auth-react/recipe/thirdparty";
import { ThirdPartyPreBuiltUI } from "supertokens-auth-react/recipe/thirdparty/prebuiltui";
import Session from "supertokens-auth-react/recipe/session";


export function getApiDomain() {
    const apiPort = 3000;
    const apiUrl = `http://localhost:${apiPort}`;
    return apiUrl;
}

export function getWebsiteDomain() {
    const websitePort = 3000;
    const websiteUrl = `http://localhost:${websitePort}`;
    return websiteUrl;
}



export const SuperTokensConfig = {
    appInfo: {
        appName: "SuperTokens Demo App",
        apiDomain: getApiDomain(),
        websiteDomain: getWebsiteDomain(),
        apiBasePath: "/api/auth/",
        websiteBasePath: "/auth",
    },
    
    recipeList: [
        ThirdParty.init({
            signInAndUpFeature: {
                providers: [
                    ThirdParty.Google.init(),
                    ThirdParty.Github.init(),
                    ThirdParty.Apple.init(),
                    ThirdParty.Twitter.init()
                ],
            },
        }),
        Session.init()
    ],
    getRedirectionURL: async (context: any) => {
        if (context.action === "SUCCESS") {
            return "/dashboard";
        }
        return undefined;
    },
};

export const recipeDetails = {
    docsLink: "https://supertokens.com/docs/quickstart/introduction",
};

export const PreBuiltUIList = [ThirdPartyPreBuiltUI];



export const ComponentWrapper = (props: { children: JSX.Element }): JSX.Element => {
    let childrenToRender = props.children;

    
    return childrenToRender;
}